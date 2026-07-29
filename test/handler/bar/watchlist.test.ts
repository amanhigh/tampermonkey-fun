/**
 * WatchlistBar contract tests (TDD red phase).
 *
 * Protects the planned compact WatchlistBar / IWatchlistBar public contract.
 *
 * Contract points under test:
 *  - IWatchlistBar exposes `refresh`, `registerEvents` (IBaseBar-compatible)
 *  - Compact-only mode: no disclosure shell, no aria/hidden/toggle markup
 *  - Loads BucketSummary from IPaintManager.summarizeBuckets()
 *  - Renders all ALL_WATCH_CATEGORIES in canonical order as colored chips
 *  - Each chip uses the configured category color, category label in accessible
 *    metadata, and the count; uncategorizedCount is included in DEFAULT_DAILY count
 *  - Status rules: SET_JOURNAL=0 => ERROR; SET_JOURNAL>0, RUNNING=0 => WARN; both>0 => OK
 *  - Left-click delegates color-filter to IFilterManager preserving ctrl/shift
 *  - Middle-click delegates reset to IFilterManager
 *  - Contextmenu/right-click prevents default and delegates flag-filter preserving shift
 *  - No automatic domain event subscriptions (WatchListHandler explicitly refreshes)
 *
 * Assumptions:
 *  - WatchlistBar will extend BaseBar<WatchlistData> (compact-only, renderDetails=null)
 *  - BarId.WATCHLIST will be 'aman-watchlist-bar'
 *  - IFilterManager will expose applyColorFilter, applyFlagFilter, resetWatchList
 *  - The BEM namespace derives from BarId.WATCHLIST as 'watchlist' (aman-watchlist-bar)
 */

import { WatchlistBar, IWatchlistBar } from '../../../src/handler/bar/watchlist';
import { IPaintManager } from '../../../src/manager/paint';
import { IFilterManager } from '../../../src/manager/filter';
import { BucketSummary, ALL_WATCH_CATEGORIES, WatchCategoryId } from '../../../src/models/watch';
import { BAR_CLASS, BarStatus } from '../../../src/models/bar';

// ── Constants ──

/**
 * Root selector for the WatchlistBar.
 * Follows the `#aman-watchlist-bar` BarId pattern.
 */
const ROOT = '#aman-watchlist-bar';
const CHIP_SELECTOR = '.aman-watchlist-bar__chip';

/** BEM class names expected from the finalized WatchlistBar contract. */
const BEM = {
  ROOT: 'aman-watchlist-bar',
  CHIP: 'aman-watchlist-bar__chip',
} as const;

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

/**
 * Simulates a click on a category chip by invoking the delegated handler.
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

  // Use mousedown for color filter (matching FilterManager pattern)
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
    resetWatchList: jest.fn(),
    refreshSummary: jest.fn(),
    // New methods expected from the planned IFilterManager extension:
    applyColorFilter: jest.fn(),
    applyFlagFilter: jest.fn(),
    resetFilters: jest.fn(),
    reapplyFilters: jest.fn(),
  } as any;
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

    it('should render all ALL_WATCH_CATEGORIES in canonical order', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 3 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      // Verify all categories appear in canonical order
      const expectedLabels = ALL_WATCH_CATEGORIES.map((cat) => cat.label);
      for (const label of expectedLabels) {
        expect(html).toContain(label);
      }

      // Verify canonical ordering by position
      for (let i = 0; i < expectedLabels.length - 1; i++) {
        const earlier = html.indexOf(expectedLabels[i]);
        const later = html.indexOf(expectedLabels[i + 1]);
        expect(earlier).toBeLessThan(later);
      }
    });
  });

  // ── Chip rendering ──

  describe('chip rendering', () => {
    it('should render each category with its configured color', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      for (const cat of ALL_WATCH_CATEGORIES) {
        expect(html).toContain(cat.color);
      }
    });

    it('should render each category with its label in accessible metadata', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      for (const cat of ALL_WATCH_CATEGORIES) {
        expect(html).toContain(cat.label);
      }
    });

    it('should render each category chip with the BEM chip class', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      // At least one chip class present (each category renders a chip)
      expect(html).toContain(BEM.CHIP);
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

  // ── Compact-only rendering ──

  describe('compact-only mode', () => {
    it('should render without disclosure/toggle/aria-expanded/aria-controls/hidden', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      const html = mockRootEl.html.mock.calls[0][0] as string;

      expect(html).toContain(BEM.CHIP);
      expect(html).not.toContain('aria-expanded');
      expect(html).not.toContain('aria-controls');
      expect(html).not.toContain('hidden');
      expect(html).not.toContain('toggle');
      expect(html).not.toContain('__toggle');
      expect(html).not.toContain('__details');
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

      // Click the first category chip (SET_JOURNAL, color=orange)
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

    it('should delegate middle-click to reset on IFilterManager', async () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      mockPaintManager.summarizeBuckets.mockResolvedValue(
        createBucketSummary({ uncategorizedCount: 0 })
      );

      await bar.refresh();

      simulateChipMiddleClick('orange');

      expect(mockFilterManager.resetFilters).toHaveBeenCalled();
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
  });

  // ── Event subscriptions ──

  describe('registerEvents', () => {
    it('should subscribe to no automatic domain events', () => {
      const bar = new WatchlistBar(mockPaintManager, mockFilterManager);
      const mockSubscriber = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      bar.registerEvents(mockSubscriber);

      // WatchListHandler explicitly refreshes the bar after watchlist painting;
      // the bar itself should not auto-subscribe to any domain events.
      expect(mockSubscriber.subscribeMany).not.toHaveBeenCalled();
      expect(mockSubscriber.subscribe).not.toHaveBeenCalled();
    });
  });
});
