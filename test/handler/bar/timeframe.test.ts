import { TimeFrameBar, ITimeFrameHandler } from '../../../src/handler/bar/timeframe';
import { ITimeFrameManager } from '../../../src/manager/timeframe';
import { IBarkatManager } from '../../../src/manager/barkat';
import { IDomManager } from '../../../src/manager/dom';
import { TickerTimeframe } from '../../../src/models/timeframe';
import { BarkatStatus, BarkatTickerAnalysis, BarkatTimeframe } from '../../../src/models/barkat';
import { ISubscriber } from '../../../src/manager/event_bus';
import { DomainEventType } from '../../../src/models/domain_event';
import { Notifier } from '../../../src/util/notify';
import { BarId, BAR_CLASS, BAR_INDICATOR_BADGE_CLASS, BAR_INDICATORS_CLASS, BarStatus } from '../../../src/models/bar';

// ── Constants ──

const TF_ROOT = `#${BarId.TIMEFRAME}`; // #aman-tf-bar
const CHIP_SELECTOR = '.aman-tf-bar__chip';
const EVENT_NS = 'bar-tf';
const CHIP_CLICK_EVENT = `click.${EVENT_NS}`;

/** Shared optional-indicator marker rendered by BaseBar. */
const MARKER_SELECTOR = `.${BAR_INDICATORS_CLASS}`;

/** Shared optional-indicator badge class used for the mismatch corner badge. */
const BADGE_CLASS = BAR_INDICATOR_BADGE_CLASS;

/** Loading / unavailable marker labels rendered by BaseBar. */
const INDICATORS_LOADING_LABEL = 'Loading indicators';
const INDICATORS_UNAVAILABLE_LABEL = 'Indicators unavailable';

/** Generic click hint used as the native chip tooltip. */
const CLICK_HINT = 'Click to add/remove.';

/** Native tooltip for a selected chip whose Barkat verdict is not preferred. */
const TITLE_SELECTED_NOT_PREFERRED = 'Selected \u00B7 Barkat: not preferred. Click to remove.';

/** Native tooltip for an unselected chip whose Barkat verdict is preferred. */
const TITLE_UNSELECTED_PREFERRED = 'Not selected \u00B7 Barkat: preferred. Click to add.';

/** BEM class names expected from the finalized BaseBar/TimeFrameBar contract. */
const BEM = {
  ROOT: 'aman-tf-bar',
  CHIP: 'aman-tf-bar__chip',
  ACTIVE: 'aman-tf-bar__chip--active',
  INACTIVE: 'aman-tf-bar__chip--inactive',
  LOADING: 'aman-tf-bar__chip--loading',
  BADGE: BADGE_CLASS,
  BADGE_GLYPH: '\u2260',
} as const;

/** Supported (assessed) Barkat frames. */
const ASSESSED: readonly BarkatTimeframe[] = [
  TickerTimeframe.SMN,
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
];

// ── Mock jQuery ──

/** Per-chip observable state backed by the mocked node (never re-created). */
interface ChipState {
  /** Latest native `title` applied to the chip. */
  title?: string;
  /** Latest badge text; `null` means no badge node is attached. */
  badge: string | null;
}

let mockRootEl: any;
let mockMarkerEl: any;
let chipEls: Map<string, any>;
let rootAttrs: Map<string, string>;
let markerHtml: string[];

function createMockElement(): any {
  return {
    html: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    addClass: jest.fn().mockReturnThis(),
    removeClass: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    find: jest.fn((): any => createMockElement()),
    append: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    length: 1,
  };
}

/** Selector BaseBar/TimeFrameBar uses to address one rendered chip. */
function chipSelector(code: TickerTimeframe): string {
  return `.${BEM.CHIP}[data-tf-code="${code}"]`;
}

/** Mock chip whose badge presence and title can be observed across updates. */
function createChipMock(state: ChipState): any {
  const badgeEl: any = {
    text: jest.fn((value: string) => {
      state.badge = value;
      return badgeEl;
    }),
    remove: jest.fn(() => {
      state.badge = null;
      return badgeEl;
    }),
    get length() {
      return state.badge === null ? 0 : 1;
    },
  };

  const chip: any = createMockElement();
  chip.attr = jest.fn((name: string, value?: string) => {
    if (name === 'title' && value !== undefined) {
      state.title = value;
    }
    return chip;
  });
  chip.find = jest.fn((selector: string) => (selector === `.${BADGE_CLASS}` ? badgeEl : createMockElement()));
  chip.append = jest.fn((html: string) => {
    state.badge = html.replace(/<[^>]*>/g, '');
    return chip;
  });
  chip.__state = state;
  return chip;
}

/** Mock chip element for one timeframe code (lives for the whole test). */
function chipEl(code: TickerTimeframe): any {
  return chipEls.get(chipSelector(code))!;
}

/** Observable state of one rendered chip. */
function chipState(code: TickerTimeframe): ChipState {
  return chipEl(code).__state as ChipState;
}

/** Mutable marker mock: length reflects whether BaseBar has appended it. */
function createMarkerMock(): any {
  const marker: any = createMockElement();
  let attached = false;
  Object.defineProperty(marker, 'length', {
    get: () => (attached ? 1 : 0),
  });
  marker.__attach = () => {
    attached = true;
  };
  marker.attrs = new Map<string, string>();
  marker.attr = jest.fn((name: string, value?: string) => {
    if (value !== undefined) {
      marker.attrs.set(name, value);
    }
    return marker;
  });
  marker.remove = jest.fn(() => {
    attached = false;
    return marker;
  });
  return marker;
}

/** Latest value applied for one marker attribute (`aria-label`, `title`). */
function markerAttr(name: string): string | undefined {
  return mockMarkerEl.attrs.get(name) as string | undefined;
}

/**
 * Simulates a root repaint: content markup replaces the previous children, so any
 * badge appended earlier disappears and every chip starts from its markup title.
 */
function repaintChips(): void {
  for (const code of Object.values(TickerTimeframe) as TickerTimeframe[]) {
    const state = chipState(code);
    state.badge = null;
    state.title = CLICK_HINT;
  }
}

/** Wires root → marker/chip/badge lookups, mirroring BaseBar's query strings. */
function wireDom(): void {
  rootAttrs = new Map<string, string>();
  markerHtml = [];
  mockMarkerEl = createMarkerMock();
  chipEls = new Map(
    (Object.values(TickerTimeframe) as TickerTimeframe[]).map((code) => [
      chipSelector(code),
      createChipMock({ badge: null, title: CLICK_HINT }),
    ])
  );

  mockRootEl.attr = jest.fn((name: string, value?: string) => {
    if (value !== undefined) {
      rootAttrs.set(name, value);
    }
    return mockRootEl;
  });
  mockRootEl.find = jest.fn((selector: string) => {
    if (selector === MARKER_SELECTOR) return mockMarkerEl;
    return chipEls.get(selector) ?? createMockElement();
  });
  mockRootEl.html = jest.fn((html?: string) => {
    // Non-empty content replaces the children; '' only clears (bar stays hidden)
    if (html) {
      mockMarkerEl.remove();
      repaintChips();
    }
    return mockRootEl;
  });
  mockRootEl.append = jest.fn((html: string) => {
    markerHtml.push(html);
    mockMarkerEl.__attach();
    const label = html.match(/aria-label="([^"]*)"/)?.[1];
    if (label !== undefined) {
      mockMarkerEl.attrs.set('aria-label', label);
    }
    const title = html.match(/title="([^"]*)"/)?.[1];
    if (title !== undefined) {
      mockMarkerEl.attrs.set('title', title);
    }
    return mockRootEl;
  });
}

function createDefaultJQuery(selector: string): any {
  if (selector === TF_ROOT) return mockRootEl;
  return createMockElement();
}

const mockJQuery = jest.fn(createDefaultJQuery);
(global as any).$ = mockJQuery;

// ── Mock Notifier ──

jest.mock('../../../src/util/notify', () => ({
  Notifier: {
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

// ── Helpers ──

/** Deferred promise helper: tests drive async phases instead of counting microtasks. */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Drains the macrotask queue so fire-and-forget async handlers settle. */
function flushAsync(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

/**
 * Finds a delegated handler bound on the bar root.
 * @param event - Full namespaced event name (e.g. `click.bar-tf`)
 * @param selector - Delegated selector
 */
function getHandler(event: string, selector: string): ((e: any) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find((c: any[]) => c[0] === event && c[1] === selector);
  return call?.[2] as ((e: any) => void) | undefined;
}

/**
 * Finds the chip click handler bound via delegated `click` event
 * on the chip selector. Returns undefined if not found.
 */
function getChipClickHandler(): ((event: any) => void) | undefined {
  return getHandler(CHIP_CLICK_EVENT, CHIP_SELECTOR);
}

/**
 * Simulates a click on a timeframe chip by invoking the delegated click handler.
 */
function simulateChipClick(attrValue: string | undefined): void {
  const fakeDomEl = { nodeType: 1, tagName: 'BUTTON' };
  const mockWrappedEl = createMockElement();
  mockWrappedEl.attr.mockReturnValue(attrValue);

  // Override $(DOM_element) to return our mock wrapped element
  mockJQuery.mockImplementation((selector: any) => {
    if (selector === TF_ROOT) return mockRootEl;
    if (selector === fakeDomEl) return mockWrappedEl;
    return createMockElement();
  });

  const clickHandler = getChipClickHandler();
  expect(clickHandler).toBeDefined();

  const event = { stopPropagation: jest.fn(), currentTarget: fakeDomEl };
  clickHandler!(event);
}

/** Non-empty root paints. `refresh()` clears the root first (bar stays hidden). */
function contentHtmlCalls(): string[] {
  return mockRootEl.html.mock.calls
    .map((c: any[]) => c[0] as string)
    .filter((html: string) => html !== '');
}

/** Returns the last non-empty HTML string painted into the bar root. */
function lastHtml(): string {
  const calls = contentHtmlCalls();
  return calls[calls.length - 1] ?? '';
}

/** Extracts the markup of a single chip button from rendered HTML. */
function chipHtml(html: string, code: TickerTimeframe): string {
  const match = html.match(new RegExp(`<button[^>]*data-tf-code="${code}"[\\s\\S]*?</button>`));
  return match?.[0] ?? '';
}

/** Latest marker markup appended to the bar root. */
function lastMarkerHtml(): string {
  return markerHtml[markerHtml.length - 1] ?? '';
}

/** Builds a valid analysis payload with all four assessed rows. */
function buildAnalysis(
  ticker: string,
  statuses: Partial<Record<TickerTimeframe, BarkatStatus>> = {}
): BarkatTickerAnalysis {
  return {
    ticker,
    timeframes: ASSESSED.map((timeframe) => ({
      timeframe,
      status: statuses[timeframe] ?? 'pass',
    })),
  };
}

// ── Tests ──

describe('TimeFrameBar', () => {
  let mockTimeFrameManager: jest.Mocked<ITimeFrameManager>;
  let mockBarkatManager: jest.Mocked<IBarkatManager>;
  let mockDomManager: jest.Mocked<IDomManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootEl = createMockElement();
    mockJQuery.mockImplementation(createDefaultJQuery);
    wireDom();

    mockTimeFrameManager = {
      apply: jest.fn(),
      getCurrentConfig: jest.fn(),
      getActiveTimeframes: jest.fn().mockResolvedValue(['TMN', 'MN', 'WK', 'DL']),
      getSequence: jest.fn(),
      toggleTimeframe: jest.fn(),
    } as any;

    mockBarkatManager = {
      getTickerAnalysis: jest.fn().mockResolvedValue(buildAnalysis('AAPL')),
    } as any;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('AAPL'),
    } as any;
  });

  const createBar = (): TimeFrameBar => new TimeFrameBar(mockTimeFrameManager, mockBarkatManager, mockDomManager);

  describe('interface contract', () => {
    it('should satisfy ITimeFrameHandler interface without exposing render', () => {
      const bar: ITimeFrameHandler = createBar();
      expect(typeof bar.refresh).toBe('function');
      expect(typeof bar.registerEvents).toBe('function');
    });
  });

  describe('refresh (compact chips)', () => {
    it('should render all six timeframe chips in YR to DL order', async () => {
      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();

      expect(html).toContain('YR');
      expect(html).toContain('SMN');
      expect(html).toContain('TMN');
      expect(html).toContain('MN');
      expect(html).toContain('WK');
      expect(html).toContain('DL');

      const yrIndex = html.indexOf('YR');
      const dlIndex = html.indexOf('DL');
      expect(yrIndex).toBeLessThan(dlIndex);
    });

    it('should mark backend-active chips with active class', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();

      expect(html).toContain(BEM.ACTIVE);
      expect(html).toContain('TMN');
      expect(html).toContain('MN');
      expect(html).toContain('WK');
      expect(html).toContain('DL');
    });

    it('should mark non-backend chips with inactive class', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();

      expect(html).toContain(BEM.INACTIVE);
    });

    it('should expose an escaped native title hint and no custom tooltip markup', async () => {
      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();

      // Unassessed YR keeps the generic click hint
      expect(chipHtml(html, TickerTimeframe.YR)).toContain(`title="${CLICK_HINT}"`);
      expect(html).not.toContain('role="tooltip"');
      expect(html).not.toContain('aria-describedby');
      expect(html).not.toContain('__tip');
      expect(html).not.toContain('__item');
    });

    it('should do nothing when bar element is not found', async () => {
      mockRootEl = { length: 0 };
      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.html).toBeUndefined();
    });

    it('should keep the bar hidden while the mandatory selection request is pending', async () => {
      const selection = deferred<readonly TickerTimeframe[]>();
      mockTimeFrameManager.getActiveTimeframes.mockReturnValue(selection.promise);

      const bar = createBar();
      const pending = bar.refresh();

      // Root is cleared on the mandatory request: an empty bar stays hidden via CSS
      expect(mockRootEl.html).toHaveBeenCalledTimes(1);
      expect(mockRootEl.html).toHaveBeenCalledWith('');
      expect(contentHtmlCalls()).toHaveLength(0);
      expect(mockBarkatManager.getTickerAnalysis).not.toHaveBeenCalled();

      selection.resolve([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK]);
      await pending;

      expect(contentHtmlCalls()).toHaveLength(1);
      expect(lastHtml()).toContain(BEM.ACTIVE);
    });

    it('should hide the root again on every new mandatory request', async () => {
      const bar = createBar();
      await bar.refresh();
      expect(contentHtmlCalls()).toHaveLength(1);

      const selection = deferred<readonly TickerTimeframe[]>();
      mockTimeFrameManager.getActiveTimeframes.mockReturnValue(selection.promise);
      mockRootEl.html.mockClear();

      const pending = bar.refresh();
      expect(mockRootEl.html).toHaveBeenCalledWith('');
      expect(contentHtmlCalls()).toHaveLength(0);

      selection.resolve([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK]);
      await pending;
      expect(contentHtmlCalls()).toHaveLength(1);
    });

    it('should treat an empty selection as a valid painted state', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([]);

      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();
      expect(html).toContain(BEM.INACTIVE);
      expect(html).not.toContain(BEM.ACTIVE);
      // Empty selection is painted, never treated as "unpainted"
      expect(chipHtml(html, TickerTimeframe.TMN)).toContain(BEM.INACTIVE);
      expect(chipHtml(html, TickerTimeframe.TMN)).toContain('aria-pressed="false"');
    });
  });

  describe('registerEvents', () => {
    it('should subscribe to both timeframe refresh events through subscribeMany', () => {
      const bar = createBar();
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        [DomainEventType.TICKER_CHANGED, DomainEventType.TICKER_TIMEFRAMES_CHANGED],
        expect.any(Function)
      );
      expect(mockSubscriber.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('chip click handling', () => {
    it('should toggle active chip through TimeFrameManager', async () => {
      const bar = createBar();
      await bar.refresh();

      simulateChipClick(TickerTimeframe.WK);

      expect(mockTimeFrameManager.toggleTimeframe).toHaveBeenCalledWith(TickerTimeframe.WK);
    });

    it('should stop event propagation to prevent display card toggle', async () => {
      const bar = createBar();
      await bar.refresh();

      const fakeDomEl = { nodeType: 1, tagName: 'BUTTON' };
      const mockWrappedEl = createMockElement();
      mockWrappedEl.attr.mockReturnValue('WK');

      mockJQuery.mockImplementation((selector: any) => {
        if (selector === TF_ROOT) return mockRootEl;
        if (selector === fakeDomEl) return mockWrappedEl;
        return createMockElement();
      });

      const stopPropagation = jest.fn();
      const clickHandler = getChipClickHandler()!;
      clickHandler({ stopPropagation, currentTarget: fakeDomEl });

      expect(stopPropagation).toHaveBeenCalled();
    });

    it('should show warning and re-render when toggle fails', async () => {
      mockTimeFrameManager.toggleTimeframe.mockRejectedValue(
        new Error('Network error')
      );

      const bar = createBar();
      await bar.refresh();

      mockRootEl.html.mockClear();

      simulateChipClick('WK');

      // Drain the background toggle handler
      await flushAsync();

      expect(Notifier.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to toggle timeframe WK')
      );
      // Error path calls refresh() → renders again (no event published on failure)
      expect(mockRootEl.html).toHaveBeenCalled();
    });

    it('should do nothing when chip has no data-code attribute', async () => {
      const bar = createBar();
      await bar.refresh();

      simulateChipClick(undefined);

      expect(mockTimeFrameManager.toggleTimeframe).not.toHaveBeenCalled();
    });
  });

  describe('status synchronization', () => {
    it('should apply block class to root element during render', async () => {
      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(BEM.ROOT);
    });

    it('should apply BAR_CLASS to root element during render', async () => {
      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(BAR_CLASS);
    });

    it('should apply ERROR status when fewer than 3 active timeframes', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);
    });

    it('should apply ERROR when fewer than 3 even if YR is present', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.YR, TickerTimeframe.WK,
      ]);

      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);
    });

    it('should apply WARN status when at least 3 active timeframes without YR', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK,
      ]);

      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.WARN}`);
    });

    it('should apply OK status when at least 3 active timeframes including YR', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.YR, TickerTimeframe.TMN, TickerTimeframe.MN,
      ]);

      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);
    });
  });

  describe('compact-only mode', () => {
    it('should render compact chips without disclosure shell', async () => {
      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();

      // Chip markup with native titles is allowed; the disclosure shell is not.
      expect(html).toContain(BEM.CHIP);
      expect(html).toContain('title="');
      expect(html).not.toContain('aria-expanded');
      expect(html).not.toContain('aria-controls');
      expect(html).not.toContain('hidden');
      expect(html).not.toContain('__toggle');
      expect(html).not.toContain('__details');
    });
  });

  // ── Barkat overlay ──

  describe('Barkat badge policy', () => {
    const matrix: Array<[string, boolean, BarkatStatus, boolean, string]> = [
      ['active + pass', true, 'pass', false, CLICK_HINT],
      ['active + warning', true, 'warning', true, TITLE_SELECTED_NOT_PREFERRED],
      ['active + fail', true, 'fail', true, TITLE_SELECTED_NOT_PREFERRED],
      ['inactive + pass', false, 'pass', true, TITLE_UNSELECTED_PREFERRED],
      ['inactive + warning', false, 'warning', false, CLICK_HINT],
      ['inactive + fail', false, 'fail', false, CLICK_HINT],
    ];

    it.each(matrix)(
      'should badge and title only on mismatch: %s',
      async (_label, isActive, status, expectBadge, expectedTitle) => {
        mockTimeFrameManager.getActiveTimeframes.mockResolvedValue(
          isActive
            ? [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK]
            : [TickerTimeframe.SMN, TickerTimeframe.MN, TickerTimeframe.WK]
        );
        mockBarkatManager.getTickerAnalysis.mockResolvedValue(
          buildAnalysis('AAPL', { [TickerTimeframe.TMN]: status })
        );

        const bar = createBar();
        await bar.refresh();

        const chip = chipHtml(lastHtml(), TickerTimeframe.TMN);
        expect(chip).toContain(`aria-pressed="${isActive ? 'true' : 'false'}"`);

        const state = chipState(TickerTimeframe.TMN);
        expect(state.title).toBe(expectedTitle);
        if (expectBadge) {
          expect(state.badge).toBe(BEM.BADGE_GLYPH);
        } else {
          expect(state.badge).toBeNull();
        }
      }
    );

    it('should never badge YR or DL even when active and unassessed', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.YR, TickerTimeframe.DL, TickerTimeframe.MN, TickerTimeframe.WK,
      ]);
      mockBarkatManager.getTickerAnalysis.mockResolvedValue(
        buildAnalysis('AAPL', {
          [TickerTimeframe.SMN]: 'fail',
          [TickerTimeframe.TMN]: 'fail',
          [TickerTimeframe.MN]: 'fail',
          [TickerTimeframe.WK]: 'fail',
        })
      );

      const bar = createBar();
      await bar.refresh();

      // Unassessed YR/DL keep the generic hint, never a mismatch title or badge
      expect(chipState(TickerTimeframe.YR).badge).toBeNull();
      expect(chipState(TickerTimeframe.DL).badge).toBeNull();
      expect(chipState(TickerTimeframe.YR).title).toBe(CLICK_HINT);
      expect(chipState(TickerTimeframe.DL).title).toBe(CLICK_HINT);
      // Active rows that fail are badged, proving the overlay is live
      expect(chipState(TickerTimeframe.MN).badge).toBe(BEM.BADGE_GLYPH);
      expect(chipState(TickerTimeframe.MN).title).toBe(TITLE_SELECTED_NOT_PREFERRED);
    });

    it('should update badges on the existing chip nodes without repainting', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK,
      ]);
      mockBarkatManager.getTickerAnalysis.mockResolvedValue(
        buildAnalysis('AAPL', { [TickerTimeframe.TMN]: 'fail' })
      );

      const bar = createBar();
      await bar.refresh();

      // One clear + one mandatory paint: the analysis never re-renders the root
      expect(mockRootEl.html).toHaveBeenCalledTimes(2);
      expect(contentHtmlCalls()).toHaveLength(1);
      expect(contentHtmlCalls()[0]).not.toContain(BADGE_CLASS);

      // The badge is appended to the already-painted chip node
      expect(chipEl(TickerTimeframe.TMN).append).toHaveBeenCalledWith(
        expect.stringContaining(`class="${BADGE_CLASS}"`)
      );
      expect(chipEl(TickerTimeframe.TMN).append).toHaveBeenCalledWith(
        expect.stringContaining(BEM.BADGE_GLYPH)
      );
      expect(chipEl(TickerTimeframe.TMN).attr).toHaveBeenCalledWith('title', TITLE_SELECTED_NOT_PREFERRED);
      // Non-mismatch chips are decorated in place with the plain hint
      expect(chipEl(TickerTimeframe.MN).attr).toHaveBeenCalledWith('title', CLICK_HINT);
      expect(chipState(TickerTimeframe.MN).badge).toBeNull();
    });

    it('should paint usable chips and a loading marker while Barkat is pending', async () => {
      const analysis = deferred<BarkatTickerAnalysis>();
      mockBarkatManager.getTickerAnalysis.mockReturnValue(analysis.promise);

      const bar = createBar();
      const pending = bar.refresh();

      // Mandatory phase first: chips painted, then indicators requested
      await flushAsync();
      expect(mockBarkatManager.getTickerAnalysis).toHaveBeenCalledTimes(1);

      const html = lastHtml();
      expect(html).toContain(BEM.ACTIVE);
      expect(html).not.toContain(BADGE_CLASS);
      expect(chipHtml(html, TickerTimeframe.TMN)).toContain('aria-pressed="true"');
      expect(chipState(TickerTimeframe.TMN).badge).toBeNull();

      // Loading marker is visible and the root reports busy
      expect(lastMarkerHtml()).toContain(`class="${BAR_INDICATORS_CLASS}"`);
      expect(markerAttr('aria-label')).toBe(INDICATORS_LOADING_LABEL);
      expect(rootAttrs.get('aria-busy')).toBe('true');

      // Chips stay clickable while the analysis is pending
      simulateChipClick(TickerTimeframe.WK);
      expect(mockTimeFrameManager.toggleTimeframe).toHaveBeenCalledWith(TickerTimeframe.WK);

      // Resolve so the pending refresh completes with the overlay applied
      analysis.resolve(buildAnalysis('AAPL', { [TickerTimeframe.TMN]: 'fail' }));
      await pending;

      expect(chipState(TickerTimeframe.TMN).badge).toBe(BEM.BADGE_GLYPH);
      expect(mockMarkerEl.remove).toHaveBeenCalled();
      expect(rootAttrs.get('aria-busy')).toBe('false');
    });
  });

  describe('Barkat failure handling', () => {
    it('should stay quiet and drop old badges when analysis is rejected', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK,
      ]);
      mockBarkatManager.getTickerAnalysis.mockResolvedValueOnce(
        buildAnalysis('AAPL', { [TickerTimeframe.TMN]: 'fail' })
      );

      const bar = createBar();
      await bar.refresh();
      expect(chipState(TickerTimeframe.TMN).badge).toBe(BEM.BADGE_GLYPH);

      mockBarkatManager.getTickerAnalysis.mockRejectedValueOnce(new Error('service down'));
      await bar.refresh();

      // Selection survives the failed analysis and falls back to the generic hint
      const html = lastHtml();
      expect(html).not.toContain(BADGE_CLASS);
      const tmnChip = chipHtml(html, TickerTimeframe.TMN);
      expect(tmnChip).toContain('aria-pressed="true"');
      expect(tmnChip).toContain(`title="${CLICK_HINT}"`);
      expect(chipState(TickerTimeframe.TMN).badge).toBeNull();
      expect(chipState(TickerTimeframe.TMN).title).toBe(CLICK_HINT);
      expect(Notifier.warn).not.toHaveBeenCalled();
    });

    it('should mark indicators unavailable quietly without changing the business status', async () => {
      mockBarkatManager.getTickerAnalysis.mockRejectedValue(new Error('service down'));
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.YR, TickerTimeframe.TMN, TickerTimeframe.MN,
      ]);

      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);
      expect(lastMarkerHtml()).toContain(`class="${BAR_INDICATORS_CLASS}"`);
      expect(markerAttr('aria-label')).toBe(INDICATORS_UNAVAILABLE_LABEL);
      expect(rootAttrs.get('aria-busy')).toBe('false');
      expect(Notifier.warn).not.toHaveBeenCalled();
    });
  });

  describe('captured ticker and stale phase guards', () => {
    it('should capture the ticker before loading the selection', async () => {
      const selection = deferred<readonly TickerTimeframe[]>();
      mockTimeFrameManager.getActiveTimeframes.mockReturnValue(selection.promise);

      const bar = createBar();
      const pending = bar.refresh();
      expect(mockDomManager.getTicker).toHaveBeenCalledTimes(1);

      // Ticker switches while the selection is still loading
      mockDomManager.getTicker.mockReturnValue('MSFT');
      selection.resolve([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK]);
      await pending;

      // Analysis still runs for the ticker captured by this request
      expect(mockBarkatManager.getTickerAnalysis).toHaveBeenCalledWith('AAPL');
    });

    it('should ignore a stale mandatory selection phase result', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValueOnce([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      const bar = createBar();
      await bar.refresh();

      // Newer refresh is pending on selections; the old content is cleared
      const staleSelection = deferred<readonly TickerTimeframe[]>();
      mockTimeFrameManager.getActiveTimeframes.mockReturnValueOnce(staleSelection.promise);
      const stale = bar.refresh();
      expect(lastHtml()).toContain(BEM.ACTIVE);

      // A still newer refresh completes and becomes the painted state
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValueOnce([
        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN,
      ]);
      await bar.refresh();
      const painted = contentHtmlCalls().length;

      // The older pending selection resolves late and must be ignored
      staleSelection.resolve([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL]);
      await stale;

      const html = lastHtml();
      expect(contentHtmlCalls()).toHaveLength(painted);
      expect(chipHtml(html, TickerTimeframe.YR)).toContain(BEM.ACTIVE);
      expect(chipHtml(html, TickerTimeframe.DL)).toContain(BEM.INACTIVE);
    });

    it('should ignore a stale indicator phase result', async () => {
      const firstAnalysis = deferred<BarkatTickerAnalysis>();
      mockBarkatManager.getTickerAnalysis
        .mockReturnValueOnce(firstAnalysis.promise)
        .mockResolvedValueOnce(buildAnalysis('AAPL'));

      const bar = createBar();
      const first = bar.refresh();
      await flushAsync();

      await bar.refresh();

      firstAnalysis.resolve(
        buildAnalysis('AAPL', {
          [TickerTimeframe.SMN]: 'fail',
          [TickerTimeframe.TMN]: 'fail',
          [TickerTimeframe.MN]: 'fail',
          [TickerTimeframe.WK]: 'fail',
        })
      );
      await first;

      // Only the legitimate mismatch badge for the unselected SMN survives
      expect(chipState(TickerTimeframe.MN).badge).toBeNull();
      expect(chipState(TickerTimeframe.MN).title).toBe(CLICK_HINT);
      expect(chipState(TickerTimeframe.SMN).badge).toBe(BEM.BADGE_GLYPH);
      expect(chipState(TickerTimeframe.SMN).title).toBe(TITLE_UNSELECTED_PREFERRED);
    });
  });

  describe('native titles and bindings', () => {
    it('should keep full detail out of the chip markup', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK,
      ]);
      mockBarkatManager.getTickerAnalysis.mockResolvedValue(
        buildAnalysis('AAPL', { [TickerTimeframe.MN]: 'warning' })
      );

      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();
      const chip = chipHtml(html, TickerTimeframe.MN);
      // Mismatch chip carries only the short native hint
      expect(chipState(TickerTimeframe.MN).title).toBe(TITLE_SELECTED_NOT_PREFERRED);
      expect(chip).not.toContain('Zone failures');
      expect(chip).not.toContain('Strategy wins');
      expect(chip).not.toContain('Strategy entries');
      expect(chip).not.toContain('%');
      // Metrics, disclaimer and detail lines are not rendered in the bar
      expect(html).not.toContain('Zone failures');
      expect(html).not.toContain('History-based suitability');
      expect(html).not.toContain('Your selection:');
      expect(html).not.toContain('role="tooltip"');
      expect(html).not.toContain('data-tf-barkat');
    });

    it('should bind only the chip click handler and dedupe it through namespaced off/on', async () => {
      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.off).toHaveBeenCalledWith(CHIP_CLICK_EVENT, CHIP_SELECTOR);
      expect(getChipClickHandler()).toBeDefined();
      // No tooltip (hover/focus/Escape) bindings remain on the bar
      const eventNames = mockRootEl.on.mock.calls.map((c: any[]) => c[0] as string);
      expect(eventNames).not.toContain(`keydown.${EVENT_NS}`);
      expect(eventNames).not.toContain(`mouseenter.${EVENT_NS}`);
      expect(eventNames).not.toContain(`focusin.${EVENT_NS}`);
    });
  });
});
