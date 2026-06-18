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
      clearReadyState: jest.fn().mockResolvedValue(undefined),
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
      expect(mockCategoryManager.clearReadyState).not.toHaveBeenCalled();
    });

    it('should detect removed tickers and clear READY state on subsequent refresh', async () => {
      // First call — establish baseline: tickers A, B, C
      mockDomManager.getTickers.mockReturnValue(new Set(['A', 'B', 'C']));
      await watchlistManager.refresh();
      expect(mockCategoryManager.clearReadyState).not.toHaveBeenCalled();

      // Second call — B and C removed
      mockDomManager.getTickers.mockReturnValue(new Set(['A']));
      await watchlistManager.refresh();
      expect(mockCategoryManager.clearReadyState).toHaveBeenCalledWith(['B', 'C']);
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
});
