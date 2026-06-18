import { TradingViewWatchlistManager, ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { ICategoryManager } from '../../src/manager/category';
import { IUIUtil } from '../../src/util/ui';
import { IDomManager } from '../../src/manager/dom';
import { IPublisher } from '../../src/manager/event_bus';
import { Constants } from '../../src/models/constant';
import { ALL_WATCH_CATEGORIES, WatchCategoryId, BucketSummary } from '../../src/models/watch';
import { DomainEventType } from '../../src/models/domain_event';

// Mock jQuery globally for DOM manipulation
const mockJQuery = jest.fn(() => ({
  toArray: jest.fn().mockReturnValue([]),
  css: jest.fn().mockReturnThis(),
  show: jest.fn().mockReturnThis(),
  hide: jest.fn().mockReturnThis(),
  has: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  empty: jest.fn().mockReturnThis(),
  appendTo: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  mousedown: jest.fn().mockReturnThis(),
  contextmenu: jest.fn().mockReturnThis(),
}));
(global as any).$ = mockJQuery;

// Mock GM global for watchlist silo
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
  getValue: jest.fn().mockResolvedValue(null),
};

describe('TradingViewWatchlistManager', () => {
  let watchlistManager: ITradingViewWatchlistManager;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockUIUtil: jest.Mocked<IUIUtil>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockPublisher: jest.Mocked<IPublisher>;

  const mockElement = { innerHTML: 'MOCKSTOCK' };
  const mockJQueryChain = {
    toArray: jest.fn().mockReturnValue([mockElement]),
    css: jest.fn().mockReturnThis(),
    show: jest.fn().mockReturnThis(),
    hide: jest.fn().mockReturnThis(),
    has: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    empty: jest.fn().mockReturnThis(),
    appendTo: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    mousedown: jest.fn().mockReturnThis(),
    contextmenu: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock dependencies
    mockPaintManager = {
      paint: jest.fn().mockResolvedValue(undefined),
      paintTickers: jest.fn().mockResolvedValue(undefined),
      summarizeBuckets: jest.fn().mockResolvedValue({ buckets: new Map(), uncategorizedCount: 0 }),
    } as unknown as jest.Mocked<IPaintManager>;

    mockCategoryManager = {
      toggleReadyState: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockUIUtil = {
      buildLabel: jest.fn().mockReturnValue(mockJQueryChain),
    } as unknown as jest.Mocked<IUIUtil>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT_TICKER'),
      getTickers: jest.fn().mockReturnValue(new Set()),
    } as unknown as jest.Mocked<IDomManager>;

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPublisher>;

    // Reset jQuery mock
    mockJQuery.mockReturnValue(mockJQueryChain);

    watchlistManager = new TradingViewWatchlistManager(
      mockPaintManager,
      mockCategoryManager,
      mockUIUtil,
      mockDomManager,
      mockPublisher
    );
  });

  describe('Constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(watchlistManager).toBeInstanceOf(TradingViewWatchlistManager);
    });

    it('should apply default white filter on construction', () => {
      // Construction triggers hideAllItems() via filterWatchList for the default filter
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQueryChain.hide).toHaveBeenCalled();
    });

    it('should not clear READY state on first refresh (baseline)', async () => {
      // First call = baseline — no removal detection
      await watchlistManager.refresh();
      expect(mockCategoryManager.toggleReadyState).not.toHaveBeenCalled();
    });

    it('should detect removed tickers and clear READY state on subsequent refresh', async () => {
      // First call — establish baseline: tickers A, B, C
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));
      await watchlistManager.refresh();
      expect(mockCategoryManager.toggleReadyState).not.toHaveBeenCalled();

      // Second call — B and C removed
      mockDomManager.getTickers.mockReturnValue(new Set(['A']));
      await watchlistManager.refresh();
      expect(mockCategoryManager.toggleReadyState).toHaveBeenCalledWith(['B', 'C']);
    });
  });

  describe('refresh', () => {
    let classifyResult: BucketSummary;

    beforeEach(() => {
      // Mock paint() and summarizeBuckets() flow
      classifyResult = {
        buckets: new Map([[WatchCategoryId.READY, 1]]),
        uncategorizedCount: 1,
      };
      mockPaintManager.summarizeBuckets.mockResolvedValue(classifyResult);
      jest.clearAllMocks();
    });

    it('should execute complete watchlist refresh via paint()', async () => {
      await watchlistManager.refresh();

      // Verify reset operations
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.WIDGET);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);

      // Verify paint() was called for full visual refresh
      expect(mockPaintManager.paint).toHaveBeenCalled();

      // Verify summarizeBuckets was called for summary display
      expect(mockPaintManager.summarizeBuckets).toHaveBeenCalledWith();
    });

    it('should build summary labels for all categories', async () => {
      await watchlistManager.refresh();

      // Should call buildLabel for each color category
      expect(mockUIUtil.buildLabel).toHaveBeenCalledTimes(ALL_WATCH_CATEGORIES.length);
    });

    it('should set widget height for expansion', async () => {
      await watchlistManager.refresh();

      expect(mockJQueryChain.css).toHaveBeenCalledWith('height', '20000px');
    });

    it('should show all lines during reset', async () => {
      await watchlistManager.refresh();

      expect(mockJQueryChain.show).toHaveBeenCalled();
    });

    it('should use returned buckets for summary display', async () => {
      await watchlistManager.refresh();

      // AAPL is in READY bucket — default_plus plus one uncategorized
      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith(
        expect.stringMatching(/1\||0\|/),
        expect.any(String)
      );
    });

    it('should save current watchlist tickers to shared GM silo on refresh', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL', 'GOOGL']));
      await watchlistManager.refresh();

      const siloKey = Constants.STORAGE.SILOS.WATCHLIST;
      expect((global as any).GM.setValue).toHaveBeenCalledWith(
        siloKey,
        expect.any(String)
      );

      // Verify the stored payload is valid JSON with tickers
      const storedArg = (global as any).GM.setValue.mock.calls[0][1];
      const parsed = JSON.parse(storedArg);
      expect(parsed.tickers).toEqual(expect.arrayContaining(['AAPL', 'GOOGL']));
      expect(parsed.updatedAt).toBeDefined();
    });

    it('should publish WATCHLIST_CHANGED with changed tickers when tickers are added', async () => {
      // First call establishes baseline with empty set
      mockDomManager.getTickers.mockReturnValue(new Set());
      await watchlistManager.refresh();
      expect(mockPublisher.publish).not.toHaveBeenCalled();

      // Second call with added ticker
      mockDomManager.getTickers.mockReturnValue(new Set(['AAPL']));
      await watchlistManager.refresh();

      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.WATCHLIST_CHANGED,
        tickers: ['AAPL'],
      });
    });
  });

  describe('refreshTickers', () => {
    beforeEach(() => {
      // Establish baseline via refresh() first
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));
    });

    it('should fall back to full refresh when baseline is not established', async () => {
      // Instantiate new manager without baseline (prevWatchlistTickers is null)
      const freshManager = new TradingViewWatchlistManager(
        mockPaintManager,
        mockCategoryManager,
        mockUIUtil,
        mockDomManager,
        mockPublisher
      );

      await freshManager.refreshTickers(['A']);

      // Falls back to full refresh via paint()
      expect(mockPaintManager.paint).toHaveBeenCalled();
    });

    it('should use paintTickers for one confirmed added ticker', async () => {
      // Establish baseline with A, B, C
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));
      await watchlistManager.refresh();
      jest.clearAllMocks();

      // Now simulate one added ticker (D)
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C', 'D']));

      await watchlistManager.refreshTickers(['D']);

      // Should use targeted paintTickers, not full paint
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['D']);
      expect(mockPaintManager.paint).not.toHaveBeenCalled();
    });

    it('should use paintTickers for one confirmed removed ticker', async () => {
      // Establish baseline with A, B, C
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));
      await watchlistManager.refresh();
      jest.clearAllMocks();

      // Now simulate one removed ticker (B)
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'C']));

      await watchlistManager.refreshTickers(['B']);

      // Should use targeted paintTickers
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['B']);
      expect(mockPaintManager.paint).not.toHaveBeenCalled();
    });

    it('should clear READY state for removed ticker', async () => {
      // Establish baseline
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B']));
      await watchlistManager.refresh();

      // Remove B
      mockDomManager.getTickers.mockReturnValue(new Set(['A']));

      await watchlistManager.refreshTickers(['B']);

      expect(mockCategoryManager.toggleReadyState).toHaveBeenCalledWith(['B']);
    });

    it('should save full current watchlist silo on targeted refresh', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B']));
      await watchlistManager.refresh();
      jest.clearAllMocks();

      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));

      await watchlistManager.refreshTickers(['C']);

      expect((global as any).GM.setValue).toHaveBeenCalledWith(
        Constants.STORAGE.SILOS.WATCHLIST,
        expect.any(String)
      );
      const storedArg = (global as any).GM.setValue.mock.calls[0][1];
      const parsed = JSON.parse(storedArg);
      expect(parsed.tickers).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    });

    it('should refresh summary and publish WATCHLIST_CHANGED', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B']));
      await watchlistManager.refresh();

      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));

      await watchlistManager.refreshTickers(['C']);

      // Summary refresh — happens inside refreshSummary
      expect(mockPaintManager.summarizeBuckets).toHaveBeenCalled();
      // Event published
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.WATCHLIST_CHANGED,
        tickers: ['C'],
      });
    });

    it('should fall back to full refresh when extracted tickers do not match actual DOM diff', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B']));
      await watchlistManager.refresh();

      // Handler extracted "X" but actual DOM diff is "C"
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));

      await watchlistManager.refreshTickers(['X']);

      // Falls back to full paint
      expect(mockPaintManager.paint).toHaveBeenCalled();
      expect(mockPaintManager.paintTickers).not.toHaveBeenCalled();
    });

    it('should fall back to full refresh when actual DOM diff has multiple tickers', async () => {
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B']));
      await watchlistManager.refresh();

      // Two added tickers
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C', 'D']));

      await watchlistManager.refreshTickers(['C']);

      // Diff size is 2, not 1 → full refresh
      expect(mockPaintManager.paint).toHaveBeenCalled();
      expect(mockPaintManager.paintTickers).not.toHaveBeenCalled();
    });
  });
});
