import { TimeFrameBar, ITimeFrameHandler } from '../../../src/handler/bar/timeframe';
import { ITimeFrameManager } from '../../../src/manager/timeframe';
import { IBarkatManager } from '../../../src/manager/barkat';
import { IDomManager } from '../../../src/manager/dom';
import { TickerTimeframe } from '../../../src/models/timeframe';
import { BarkatStatus, BarkatTickerAnalysis } from '../../../src/models/barkat';
import { ISubscriber } from '../../../src/manager/event_bus';
import { DomainEventType } from '../../../src/models/domain_event';
import { Notifier } from '../../../src/util/notify';
import { BarId, BAR_CLASS, BarStatus } from '../../../src/models/bar';

// ── Constants ──

const TF_ROOT = `#${BarId.TIMEFRAME}`; // #aman-tf-bar
const CHIP_SELECTOR = '.aman-tf-bar__chip';
const ITEM_SELECTOR = '.aman-tf-bar__item';
const EVENT_NS = 'bar-tf';
const CHIP_CLICK_EVENT = `click.${EVENT_NS}`;

/** BEM class names expected from the finalized BaseBar/TimeFrameBar contract. */
const BEM = {
  ROOT: 'aman-tf-bar',
  CHIP: 'aman-tf-bar__chip',
  ACTIVE: 'aman-tf-bar__chip--active',
  INACTIVE: 'aman-tf-bar__chip--inactive',
  LOADING: 'aman-tf-bar__chip--loading',
  BADGE: 'aman-tf-bar__badge',
  BADGE_GLYPH: '\u2260',
  TIP: 'aman-tf-bar__tip',
  TIP_LINE_ATTENTION: 'aman-tf-bar__tip-line--attention',
  ITEM_DISMISSED: 'aman-tf-bar__item--tip-dismissed',
} as const;

/** Supported (assessed) Barkat frames. */
const ASSESSED: readonly TickerTimeframe[] = [
  TickerTimeframe.SMN,
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
];

// ── Mock jQuery ──

let mockRootEl: any;

function createMockElement(): any {
  return {
    html: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    addClass: jest.fn().mockReturnThis(),
    removeClass: jest.fn().mockReturnThis(),
    toggleClass: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnValue(undefined),
    closest: jest.fn().mockReturnThis(),
    length: 1,
  };
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

/**
 * Flushes pending microtasks so fire-and-forget async work completes.
 */
async function flushMicrotasks(): Promise<void> {
  // Each await drains one level of the microtask queue.
  // The refresh chain needs: selection paint → analysis paint.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/** Returns the last HTML string painted into the bar root. */
function lastHtml(): string {
  const calls = mockRootEl.html.mock.calls;
  return (calls[calls.length - 1]?.[0] as string) ?? '';
}

/** Extracts the markup of a single chip button from rendered HTML. */
function chipHtml(html: string, code: TickerTimeframe): string {
  const match = html.match(new RegExp(`<button[^>]*data-tf-code="${code}"[\\s\\S]*?</button>`));
  return match?.[0] ?? '';
}

/** Builds a valid analysis payload with all four assessed rows. */
function buildAnalysis(
  ticker: string,
  statuses: Partial<Record<TickerTimeframe, BarkatStatus>> = {},
  percentages: Partial<Record<TickerTimeframe, number | null>> = {}
): BarkatTickerAnalysis {
  return {
    ticker,
    timeframes: ASSESSED.map((timeframe) => {
      const zonePercentage = percentages[timeframe];
      return {
        timeframe,
        status: statuses[timeframe] ?? 'pass',
        metrics: {
          zone_failures: {
            percentage: zonePercentage !== undefined ? zonePercentage : 0,
            status: statuses[timeframe] ?? 'pass',
          },
          strategy_wins: { percentage: null, status: 'pass' },
          strategy_entries: { percentage: 50, status: 'pass' },
        },
      };
    }),
  } as BarkatTickerAnalysis;
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

      const html = mockRootEl.html.mock.calls[0][0] as string;

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

      const html = mockRootEl.html.mock.calls[0][0] as string;

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

      const html = mockRootEl.html.mock.calls[0][0] as string;

      expect(html).toContain(BEM.INACTIVE);
    });

    it('should expose tooltip markup with the existing click affordance', async () => {
      const bar = createBar();
      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      expect(html).toContain(BEM.TIP);
      expect(html).toContain('role="tooltip"');
      expect(html).toContain('Click to add/remove.');
    });

    it('should do nothing when bar element is not found', async () => {
      mockRootEl = { length: 0 };
      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.html).toBeUndefined();
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

      // Flush microtasks so the async handler completes
      await flushMicrotasks();

      expect(Notifier.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to toggle timeframe WK')
      );
      // Error path calls refresh() → render() (no event published on failure)
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

      const html = mockRootEl.html.mock.calls[0][0] as string;

      // Chip and tooltip markup are allowed; the disclosure shell is not.
      expect(html).toContain(BEM.CHIP);
      expect(html).toContain(BEM.TIP);
      expect(html).not.toContain('aria-expanded');
      expect(html).not.toContain('aria-controls');
      expect(html).not.toContain('hidden');
      expect(html).not.toContain('__toggle');
      expect(html).not.toContain('__details');
    });
  });

  // ── Barkat overlay ──

  describe('Barkat badge policy', () => {
    const matrix: Array<[string, boolean, BarkatStatus, boolean]> = [
      ['active + pass', true, 'pass', false],
      ['active + warning', true, 'warning', true],
      ['active + fail', true, 'fail', true],
      ['inactive + pass', false, 'pass', true],
      ['inactive + warning', false, 'warning', false],
      ['inactive + fail', false, 'fail', false],
    ];

    it.each(matrix)('should badge only on mismatch: %s', async (_label, isActive, status, expectBadge) => {
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
      if (expectBadge) {
        expect(chip).toContain(BEM.BADGE);
        expect(chip).toContain(BEM.BADGE_GLYPH);
      } else {
        expect(chip).not.toContain(BEM.BADGE);
      }
    });

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

      const html = lastHtml();
      expect(chipHtml(html, TickerTimeframe.YR)).not.toContain(BEM.BADGE);
      expect(chipHtml(html, TickerTimeframe.DL)).not.toContain(BEM.BADGE);
      // Active rows that fail are badged, proving the overlay is live
      expect(chipHtml(html, TickerTimeframe.MN)).toContain(BEM.BADGE);
      expect(html).toContain('Barkat analysis: YR not assessed');
    });

    it('should paint active selections without waiting for Barkat (pending selections usable)', async () => {
      let resolveAnalysis!: (value: BarkatTickerAnalysis) => void;
      mockBarkatManager.getTickerAnalysis.mockReturnValue(
        new Promise<BarkatTickerAnalysis>((resolve) => {
          resolveAnalysis = resolve;
        })
      );

      const bar = createBar();
      void bar.refresh();
      await flushMicrotasks();

      // Selection is painted with a loading tooltip and no badges yet
      const pendingHtml = lastHtml();
      expect(pendingHtml).toContain(BEM.ACTIVE);
      expect(pendingHtml).not.toContain(BEM.BADGE);
      expect(pendingHtml).toContain('loading');

      // Chips stay clickable while analysis is pending
      simulateChipClick(TickerTimeframe.WK);
      expect(mockTimeFrameManager.toggleTimeframe).toHaveBeenCalledWith(TickerTimeframe.WK);

      // Resolve so the pending refresh completes
      resolveAnalysis(buildAnalysis('AAPL'));
      await flushMicrotasks();
    });
  });

  describe('Barkat failure handling', () => {
    it('should stay quiet and remove old badges when analysis is rejected', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK,
      ]);
      mockBarkatManager.getTickerAnalysis.mockResolvedValueOnce(
        buildAnalysis('AAPL', { [TickerTimeframe.TMN]: 'fail' })
      );

      const bar = createBar();
      await bar.refresh();
      expect(lastHtml()).toContain(BEM.BADGE);

      mockBarkatManager.getTickerAnalysis.mockRejectedValueOnce(new Error('service down'));
      await bar.refresh();

      const html = lastHtml();
      expect(html).not.toContain(BEM.BADGE);
      expect(html).toContain('unavailable');
      expect(Notifier.warn).not.toHaveBeenCalled();
    });

    it('should keep the selection status policy unchanged when analysis fails', async () => {
      mockBarkatManager.getTickerAnalysis.mockRejectedValue(new Error('service down'));
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.YR, TickerTimeframe.TMN, TickerTimeframe.MN,
      ]);

      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);
    });
  });

  describe('latest-wins refresh', () => {
    it('should ignore a stale selection phase result and clear old overlays while pending', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValueOnce([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL,
      ]);

      const bar = createBar();
      await bar.refresh();
      // Earlier paint: SMN is unselected but preferred -> mismatch badge
      expect(lastHtml()).toContain(BEM.BADGE);

      // Newer refresh is pending on selections
      let resolvePendingActive!: (value: readonly TickerTimeframe[]) => void;
      mockTimeFrameManager.getActiveTimeframes.mockReturnValueOnce(
        new Promise<readonly TickerTimeframe[]>((resolve) => {
          resolvePendingActive = resolve;
        })
      );
      const pending = bar.refresh();

      // Old overlay is cleared immediately; retained selection is still shown
      const pendingHtml = lastHtml();
      expect(pendingHtml).not.toContain(BEM.BADGE);
      expect(pendingHtml).toContain('Barkat analysis: loading');
      expect(chipHtml(pendingHtml, TickerTimeframe.DL)).toContain(BEM.ACTIVE);

      // A still newer refresh completes and becomes the painted state
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValueOnce([
        TickerTimeframe.YR, TickerTimeframe.SMN, TickerTimeframe.TMN, TickerTimeframe.MN,
      ]);
      await bar.refresh();
      expect(chipHtml(lastHtml(), TickerTimeframe.YR)).toContain(BEM.ACTIVE);

      // The older pending selection resolves late and must be ignored
      resolvePendingActive([TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL]);
      await pending;

      const html = lastHtml();
      expect(chipHtml(html, TickerTimeframe.YR)).toContain(BEM.ACTIVE);
      expect(chipHtml(html, TickerTimeframe.DL)).toContain(BEM.INACTIVE);
    });

    it('should ignore a stale analysis phase result', async () => {
      let resolveFirstAnalysis!: (value: BarkatTickerAnalysis) => void;
      mockBarkatManager.getTickerAnalysis
        .mockReturnValueOnce(
          new Promise<BarkatTickerAnalysis>((resolve) => {
            resolveFirstAnalysis = resolve;
          })
        )
        .mockResolvedValueOnce(buildAnalysis('AAPL'));

      const bar = createBar();
      const first = bar.refresh();
      await flushMicrotasks();

      await bar.refresh();

      resolveFirstAnalysis(
        buildAnalysis('AAPL', {
          [TickerTimeframe.SMN]: 'fail',
          [TickerTimeframe.TMN]: 'fail',
          [TickerTimeframe.MN]: 'fail',
          [TickerTimeframe.WK]: 'fail',
        })
      );
      await first;

      const html = lastHtml();
      // Only the legitimate mismatch badge for the unselected SMN survives
      expect(chipHtml(html, TickerTimeframe.MN)).not.toContain(BEM.BADGE);
      expect(html).toContain('pass (preferred)');
    });
  });

  describe('tooltip content and interactions', () => {
    it('should link the chip to a hoverable tooltip with selection, status, metrics and disclaimers', async () => {
      mockTimeFrameManager.getActiveTimeframes.mockResolvedValue([
        TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK,
      ]);
      mockBarkatManager.getTickerAnalysis.mockResolvedValue(
        buildAnalysis('AAPL', { [TickerTimeframe.MN]: 'warning' }, { [TickerTimeframe.MN]: null })
      );

      const bar = createBar();
      await bar.refresh();

      const html = lastHtml();
      const chip = chipHtml(html, TickerTimeframe.MN);
      expect(chip).toContain('aria-describedby="aman-tf-bar-tip-MN"');
      expect(html).toContain(`id="aman-tf-bar-tip-MN"`);
      expect(html).toContain('Your selection: selected');
      expect(html).toContain('warning (not preferred)');
      expect(html).toContain('Zone failures: \u2014 (warning)');
      expect(html).toContain('Strategy wins: \u2014 (pass)');
      expect(html).toContain('Strategy entries: 50% (pass)');
      expect(html).toContain(BEM.TIP_LINE_ATTENTION);
      expect(html).toContain('History-based suitability, not a forecast.');
      expect(html).toContain('Click to add/remove.');
    });

    it('should dismiss the tooltip on Escape without toggling', async () => {
      const bar = createBar();
      await bar.refresh();

      const fakeChip = { nodeType: 1, tagName: 'BUTTON' };
      const itemMock = createMockElement();
      const chipMock = createMockElement();
      chipMock.closest.mockReturnValue(itemMock);
      mockJQuery.mockImplementation((selector: any) => {
        if (selector === TF_ROOT) return mockRootEl;
        if (selector === fakeChip) return chipMock;
        return createMockElement();
      });

      const keyHandler = getHandler(`keydown.${EVENT_NS}`, CHIP_SELECTOR)!;
      const stopPropagation = jest.fn();
      keyHandler({ key: 'Escape', stopPropagation, currentTarget: fakeChip });

      expect(stopPropagation).toHaveBeenCalled();
      expect(itemMock.addClass).toHaveBeenCalledWith(BEM.ITEM_DISMISSED);
      expect(mockTimeFrameManager.toggleTimeframe).not.toHaveBeenCalled();
    });

    it('should restore the tooltip on hover and focus without toggling', async () => {
      const bar = createBar();
      await bar.refresh();

      const itemMock = createMockElement();
      mockJQuery.mockImplementation((selector: any) => {
        if (selector === TF_ROOT) return mockRootEl;
        return itemMock;
      });

      const hoverHandler = getHandler(`mouseenter.${EVENT_NS}`, ITEM_SELECTOR)!;
      hoverHandler({ currentTarget: {} });
      expect(itemMock.removeClass).toHaveBeenCalledWith(BEM.ITEM_DISMISSED);

      const focusHandler = getHandler(`focusin.${EVENT_NS}`, ITEM_SELECTOR)!;
      focusHandler({ currentTarget: {} });
      expect(itemMock.removeClass).toHaveBeenCalledTimes(2);
      expect(mockTimeFrameManager.toggleTimeframe).not.toHaveBeenCalled();
    });

    it('should dedupe delegated bindings through namespaced off/on', async () => {
      const bar = createBar();
      await bar.refresh();

      expect(mockRootEl.off).toHaveBeenCalledWith(CHIP_CLICK_EVENT, CHIP_SELECTOR);
      expect(mockRootEl.off).toHaveBeenCalledWith(`keydown.${EVENT_NS}`, CHIP_SELECTOR);
      expect(mockRootEl.off).toHaveBeenCalledWith(`mouseenter.${EVENT_NS}`, ITEM_SELECTOR);
      expect(mockRootEl.off).toHaveBeenCalledWith(`focusin.${EVENT_NS}`, ITEM_SELECTOR);
    });
  });
});
