/**
 * WatchlistBar contract tests (TDD red phase).
 *
 * Protects the planned expandable WatchlistBar / IWatchlistBar public contract.
 *
 * Contract points under test:
 *  - IWatchlistBar exposes `refresh`, `registerEvents` (IBaseBar-compatible)
 *  - WatchlistBar is expandable via BaseBar (disclosure shell, toggle, details)
 *  - `refreshEvents` subscribes exactly to: FIRST_LOAD, WATCHLIST_CHANGED,
 *    TICKER_CHANGED, TICKER_TRACKING_STARTED, TICKER_TRACKING_STOPPED,
 *    TICKER_METADATA_CHANGED, TICKER_CATEGORY_CHANGED, TICKER_TIMEFRAMES_CHANGED
 *  - Loads BucketSummary from IPaintManager.summarizeBuckets()
   *  - Compact toggle content renders eight non-Blacklisted count-only span chips
 *  - Blacklisted is absent from collapsed compact content
 *  - Expanded details render only Blacklisted with label, dimgrey color, and count
 *  - Each chip uses the configured category color, category label in accessible
 *    metadata, and the count; uncategorizedCount is included in DEFAULT_DAILY count
 *  - Status rules: SET_JOURNAL=0 => ERROR; SET_JOURNAL>0, RUNNING=0 => WARN; both>0 => OK
 *  - Chip mousedown/contextmenu preserve current filter actions/modifiers and call stopPropagation
 *  - Outer toggle/chevron behavior covered without requiring nested buttons
 *
 * Assumptions:
 *  - WatchlistBar extends BaseBar<BucketSummary> (expandable, renderDetails returns string)
 *  - BarId.WATCHLIST will be 'aman-watchlist-bar'
 *  - IFilterManager will expose applyColorFilter, applyFlagFilter, resetFilters
 *  - The BEM namespace derives from BarId.WATCHLIST as 'watchlist' (aman-watchlist-bar)
   *  - Non-Blacklisted categories rendered as count-only <span> chips inside toggle button
 *  - Blacklisted rendered only in expanded details
 */

import { WatchlistBar, IWatchlistBar } from '../../../src/handler/bar/watchlist';
import { IPaintManager } from '../../../src/manager/paint';
import { IFilterManager } from '../../../src/manager/filter';
import { BucketSummary, ALL_WATCH_CATEGORIES, WatchCategoryId } from '../../../src/models/watch';
import { BAR_CLASS, BarStatus } from '../../../src/models/bar';
import { DomainEventType } from '../../../src/models/domain_event';

// ── Constants ──

/**
 * Root selector for the WatchlistBar.
 * Follows the `#aman-watchlist-bar` BarId pattern.
 */
const ROOT = '#aman-watchlist-bar';
const CHIP_SELECTOR = 'span[data-color]';

/** BEM class names expected from the finalized WatchlistBar contract. */
const BEM = {
  ROOT: 'aman-watchlist-bar',
  TOGGLE: 'aman-watchlist-bar__toggle',
  DETAILS: 'aman-watchlist-bar__details',
} as const;

/** Categories expected in compact toggle content (all except BLACKLISTED). */
const COMPACT_CATEGORIES = ALL_WATCH_CATEGORIES.filter(
  (cat) => cat.id !== WatchCategoryId.BLACKLISTED
);

/** Blacklisted category definition. */
const BLACKLISTED = ALL_WATCH_CATEGORIES.find(
  (cat) => cat.id === WatchCategoryId.BLACKLISTED
)!;

/** All 8 events that refreshEvents must subscribe to. */
const EXPECTED_REFRESH_EVENTS = [
  DomainEventType.FIRST_LOAD,
  DomainEventType.WATCHLIST_CHANGED,
  DomainEventType.TICKER_CHANGED,
  DomainEventType.TICKER_TRACKING_STARTED,
  DomainEventType.TICKER_TRACKING_STOPPED,
  DomainEventType.TICKER_METADATA_CHANGED,
  DomainEventType.TICKER_CATEGORY_CHANGED,
  DomainEventType.TICKER_TIMEFRAMES_CHANGED,
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
    attr: jest.fn().mockReturnValue(undefined),
    data: jest.fn().mockReturnValue(undefined),
    length: 1,
  };
}

function createDefaultJQuery(selector: string): any {
  if (selector === ROOT) return mockRootEl;
  return createMockElement();
}

const mockJQuery = jest.fn(createDefaultJQuery);
(global as any).$ = mockJQuery;

// ── Mock Notifier ──

jest.mock('../../../src/util/notify', () => ({
  Notifier: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    red: jest.fn(),
    message: jest.fn(),
  },
}));

// ── Helpers ──

function getChipMouseDownHandler(): ((event: any) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find(
    (c: any[]) => typeof c[0] === 'string' && c[0].startsWith('mousedown') && c[1] === CHIP_SELECTOR
  );
  return call?.[2] as ((event: any) => void) | undefined;
}

function getContextMenuHandler(): ((event: any) => void) | undefined {
  const call = mockRootEl.on.mock.calls.find(
    (c: any[]) => typeof c[0] === 'string' && c[0].startsWith('contextmenu') && c[1] === CHIP_SELECTOR
  );
  return call?.[2] as ((event: any) => void) | undefined;
}

function invokeToggleHandler(): void {
  const call = mockRootEl.on.mock.calls.find(
    (c: any[]) => c[0] === 'click.bar-watchlist' && c[1] === `.${BEM.TOGGLE}`
  );
  expect(call).toBeDefined();
  const handler = call?.[2] as ((event: JQuery.ClickEvent) => void) | undefined;
  expect(handler).toBeDefined();
  handler!({ target: {} } as JQuery.ClickEvent);
}

/**
 * Simulates a chip mousedown by invoking the delegated handler.
 * @param chipColor - The data-color attribute value on the chip.
 */
function simulateChipClick(
  chipColor: string | undefined,
  modifiers: { ctrlKey?: boolean; shiftKey?: boolean; button?: number } = {}
): void {
  const fakeDomEl = { nodeType: 1, tagName: 'SPAN' };
  const mockWrappedEl = createMockElement();
  mockWrappedEl.data.mockReturnValue(chipColor);

  mockJQuery.mockImplementation((selector: any) => {
    if (selector === ROOT) return mockRootEl;
    if (selector === fakeDomEl) return mockWrappedEl;
    if (selector === $(fakeDomEl)) return mockWrappedEl;
    return createMockElement();
  });

  const mouseDownHandler = getChipMouseDownHandler();
  expect(mouseDownHandler).toBeDefined();

  const mouseEvent = {
    which: modifiers.button ?? 1,
    target: fakeDomEl,
    originalEvent: {
      ctrlKey: modifiers.ctrlKey ?? false,
      shiftKey: modifiers.shiftKey ?? false,
    },
    stopPropagation: jest.fn(),
  };
  mouseDownHandler!(mouseEvent);
}

function simulateChipMiddleClick(chipColor: string | undefined): void {
  simulateChipClick(chipColor, { button: 2 });
}

function simulateChipContextMenu(
  chipColor: string | undefined,
  shiftKey = false
): void {
  const fakeDomEl = { nodeType: 1, tagName: 'SPAN' };
  const mockWrappedEl = createMockElement();
  mockWrappedEl.data.mockReturnValue(chipColor);

  mockJQuery.mockImplementation((selector: any) => {
    if (selector === ROOT) return mockRootEl;
    if (selector === fakeDomEl) return mockWrappedEl;
    if (selector === $(fakeDomEl)) return mockWrappedEl;
    return createMockElement();
  });

  const contextMenuHandler = getContextMenuHandler();
  expect(contextMenuHandler).toBeDefined();

  const event = {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: fakeDomEl,
    originalEvent: { shiftKey },
  };
  contextMenuHandler!(event);
}

// ── Mock Factories ──

function createMockPaintManager(): jest.Mocked<IPaintManager> {
  return {
    paint: jest.fn().mockResolvedValue(undefined),
    paintTickers: jest.fn().mockResolvedValue(undefined),
    paintHeader: jest.fn().mockResolvedValue(undefined),
    summarizeBuckets: jest.fn().mockResolvedValue(createBucketSummary()),
  };
}

function createMockFilterManager(): jest.Mocked<IFilterManager> {
  return {
    applyColorFilter: jest.fn(),
    applyFlagFilter: jest.fn(),
    resetFilters: jest.fn(),
    reapplyFilters: jest.fn(),
  };
}

function createBucketSummary(
  overrides: Partial<{ buckets: Map<WatchCategoryId, number>; uncategorizedCount: number }> = {}
): BucketSummary {
  return {
    buckets: overrides.buckets ?? new Map(),
    uncategorizedCount: overrides.uncategorizedCount ?? 0,
  };
}

// ── Tests ──

describe('WatchlistBar', () => {
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockFilterManager: jest.Mocked<IFilterManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootEl = createMockElement();
    mockPaintManager = createMockPaintManager();
    mockFilterManager = createMockFilterManager();
    mockJQuery.mockImplementation(createDefaultJQuery);
  });

  // ── Interface contract ──

  describe('interface contract', () => {
    it('should expose refresh', () => {
      const bar: IWatchlistBar = new WatchlistBar(mockPaintManager, mockFilterManager);
      expect(typeof bar.refresh).toBe('function');
    });

    it('should expose registerEvents', () => {
      const bar: IWatchlistBar = new WatchlistBar(mockPaintManager, mockFilterManager);
      expect(typeof bar.registerEvents).toBe('function');
    });
  });

  // ── Data loading ──

  describe('refresh', () => {
    it('should load BucketSummary from IPaintManager.summarizeBuckets()', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 5 })
      );

      await bar.refresh();

      expect(mockPaintManager.summarizeBuckets).toHaveBeenCalledTimes(1);
    });
  });

  // ── Refresh event subscriptions ──

  describe('registerEvents', () => {
    it('should subscribe to exactly 8 refresh events via registerEvents', () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const mockSubscriber = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        expect.arrayContaining(EXPECTED_REFRESH_EVENTS),
        expect.any(Function)
      );

      // Verify exactly 8 events are passed
      const eventsArg = mockSubscriber.subscribeMany.mock.calls[0][0];
      expect(eventsArg).toHaveLength(EXPECTED_REFRESH_EVENTS.length);
    });

    it('should not subscribe to any rendering-specific events', () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const mockSubscriber = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      // Only one subscribeMany call for the 8 refresh events
      expect(mockSubscriber.subscribeMany).toHaveBeenCalledTimes(1);
    });
  });

  // ── Expandable mode via BaseBar ──

  describe('expandable mode', () => {
    it('should render a disclosure toggle button in the root', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain(BEM.TOGGLE);
      expect(html).toContain('aria-expanded');
      expect(html).toContain('aria-controls');
    });

    it('should render a details container in the root', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain(BEM.DETAILS);
    });

    it('should default to collapsed (aria-expanded=false)', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;
      expect(html).toContain('aria-expanded="false"');
    });
  });

  // ── Compact toggle content ──

  describe('compact toggle content', () => {
    it('should render eight non-Blacklisted categories as span chips', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      for (const cat of COMPACT_CATEGORIES) {
        expect(html).toContain(cat.label);
        expect(html).toContain(`data-color="${cat.color}"`);
      }

      const toggleHtml = html.match(/<button[^>]*>([\s\S]*?)<\/button>/)![1];
      expect(toggleHtml).toContain(`class="${BEM.ROOT}__row"`);
      expect(toggleHtml).toContain(`class="${BEM.ROOT}__chevron"`);
      expect(toggleHtml).not.toContain('>Ready</span>');
    });

    it('should not render Blacklisted in compact toggle content', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      // Extract only the toggle button portion (between <button...> and </button>)
      const toggleMatch = html.match(/<button[^>]*>([\s\S]*?)<\/button>/);
      expect(toggleMatch).not.toBeNull();
      const toggleHtml = toggleMatch![1];

      expect(toggleHtml).not.toContain(BLACKLISTED.label);
    });

    it('should render each chip with its label in accessible metadata', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      for (const cat of COMPACT_CATEGORIES) {
        expect(html).toContain(cat.label);
      }
    });

    it('should include category count in each chip', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const buckets = new Map<WatchCategoryId, number>();
      buckets.set(WatchCategoryId.SET_JOURNAL, 10);
      buckets.set(WatchCategoryId.READY, 5);
      buckets.set(WatchCategoryId.RUNNING, 3);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ buckets, uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      expect(html).toContain('10');
      expect(html).toContain('5');
      expect(html).toContain('3');
    });

    it('should include uncategorizedCount in DEFAULT_DAILY display count', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const buckets = new Map<WatchCategoryId, number>();
      buckets.set(WatchCategoryId.DEFAULT_DAILY, 8);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ buckets, uncategorizedCount: 4 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      // DEFAULT_DAILY count (8) + uncategorizedCount (4) = 12
      expect(html).toContain('12');
    });
  });

  // ── Expanded details ──

  describe('expanded details', () => {
    it('should render only Blacklisted category in expanded details', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      invokeToggleHandler();

      const html = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0] as string;

      // Extract the details container content
      const detailsMatch = html.match(
        new RegExp(`<div[^>]*class="${BEM.DETAILS}"[^>]*>([\\s\\S]*?)</div>`)
      );
      expect(detailsMatch).not.toBeNull();
      const detailsHtml = detailsMatch![1];

      expect(detailsHtml).toContain(BLACKLISTED.label);
      expect(detailsHtml).toContain(BLACKLISTED.color);
    });

    it('should show Blacklisted count in expanded details', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const buckets = new Map<WatchCategoryId, number>();
      buckets.set(WatchCategoryId.BLACKLISTED, 7);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ buckets, uncategorizedCount: 0 })
      );

      await bar.refresh();

      invokeToggleHandler();

      const html = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0] as string;
      const detailsMatch = html.match(
        new RegExp(`<div[^>]*class="${BEM.DETAILS}"[^>]*>([\\s\\S]*?)</div>`)
      );
      expect(detailsMatch).not.toBeNull();
      const detailsHtml = detailsMatch![1];

      expect(detailsHtml).toContain('7');
      expect(detailsHtml).toContain(`${BLACKLISTED.label}:`);
    });

    it('should use dimgrey color for Blacklisted in details', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      invokeToggleHandler();

      const html = mockRootEl.html.mock.calls[mockRootEl.html.mock.calls.length - 1][0] as string;
      const detailsMatch = html.match(
        new RegExp(`<div[^>]*class="${BEM.DETAILS}"[^>]*>([\\s\\S]*?)</div>`)
      );
      expect(detailsMatch).not.toBeNull();
      const detailsHtml = detailsMatch![1];

      expect(detailsHtml).toContain('dimgrey');
    });
  });

  // ── Status rules ──

  describe('status synchronization', () => {
    it('should apply BAR_CLASS to root element during render', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(BAR_CLASS);
    });

    it('should apply ERROR status when SET_JOURNAL count is 0', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const buckets = new Map<WatchCategoryId, number>();
      buckets.set(WatchCategoryId.SET_JOURNAL, 0);
      buckets.set(WatchCategoryId.RUNNING, 5);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ buckets, uncategorizedCount: 0 })
      );

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);
    });

    it('should apply WARN status when SET_JOURNAL > 0 and RUNNING count is 0', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const buckets = new Map<WatchCategoryId, number>();
      buckets.set(WatchCategoryId.SET_JOURNAL, 3);
      buckets.set(WatchCategoryId.RUNNING, 0);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ buckets, uncategorizedCount: 0 })
      );

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.WARN}`);
    });

    it('should apply OK status when both SET_JOURNAL > 0 and RUNNING > 0', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const buckets = new Map<WatchCategoryId, number>();
      buckets.set(WatchCategoryId.SET_JOURNAL, 3);
      buckets.set(WatchCategoryId.RUNNING, 2);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ buckets, uncategorizedCount: 0 })
      );

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.OK}`);
    });

    it('should apply ERROR when both SET_JOURNAL and RUNNING are 0', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const buckets = new Map<WatchCategoryId, number>();
      buckets.set(WatchCategoryId.SET_JOURNAL, 0);
      buckets.set(WatchCategoryId.RUNNING, 0);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ buckets, uncategorizedCount: 0 })
      );

      await bar.refresh();

      expect(mockRootEl.addClass).toHaveBeenCalledWith(`${BAR_CLASS}--${BarStatus.ERROR}`);
    });
  });

  // ── Delegated click handling ──

  describe('chip click handling', () => {
    it('should delegate left-click to applyColorFilter on IFilterManager', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      simulateChipClick('orange');

      expect(mockFilterManager.applyColorFilter).toHaveBeenCalledWith(
        'orange',
        false,
        false
      );
    });

    it('should preserve ctrl modifier on left-click', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      simulateChipClick('orange', { ctrlKey: true });

      expect(mockFilterManager.applyColorFilter).toHaveBeenCalledWith(
        'orange',
        false,
        true
      );
    });

    it('should preserve shift modifier on left-click', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      simulateChipClick('orange', { shiftKey: true });

      expect(mockFilterManager.applyColorFilter).toHaveBeenCalledWith(
        'orange',
        true,
        false
      );
    });

    it('should delegate middle-click to resetFilters on IFilterManager', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      simulateChipMiddleClick('orange');

      expect(mockFilterManager.resetFilters).toHaveBeenCalled();
    });

    it('should call stopPropagation on chip mousedown', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const fakeDomEl = { nodeType: 1, tagName: 'SPAN' };
      const mockWrappedEl = createMockElement();
      mockWrappedEl.data.mockReturnValue('orange');

      mockJQuery.mockImplementation((selector: any) => {
        if (selector === ROOT) return mockRootEl;
        if (selector === fakeDomEl) return mockWrappedEl;
        return createMockElement();
      });

      const mouseDownHandler = getChipMouseDownHandler()!;
      const mouseEvent = {
        which: 1,
        target: fakeDomEl,
        originalEvent: { ctrlKey: false, shiftKey: false },
        stopPropagation: jest.fn(),
      };
      mouseDownHandler(mouseEvent);

      expect(mouseEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  // ── Context menu / right-click ──

  describe('context menu', () => {
    it('should prevent default on contextmenu and delegate to applyFlagFilter', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      simulateChipContextMenu('orange');

      expect(mockFilterManager.applyFlagFilter).toHaveBeenCalledWith('orange', false);
    });

    it('should preserve shift modifier on right-click flag filter', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      simulateChipContextMenu('orange', true);

      expect(mockFilterManager.applyFlagFilter).toHaveBeenCalledWith('orange', true);
    });

    it('should call stopPropagation on contextmenu', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const fakeDomEl = { nodeType: 1, tagName: 'SPAN' };
      const mockWrappedEl = createMockElement();
      mockWrappedEl.data.mockReturnValue('orange');

      mockJQuery.mockImplementation((selector: any) => {
        if (selector === ROOT) return mockRootEl;
        if (selector === fakeDomEl) return mockWrappedEl;
        return createMockElement();
      });

      const contextMenuHandler = getContextMenuHandler()!;
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: fakeDomEl,
        originalEvent: { shiftKey: false },
      };
      contextMenuHandler(event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
});
