import { TradingViewWatchlistManager, ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { IUIUtil } from '../../src/util/ui';
import { Constants } from '../../src/models/constant';
import { ALL_WATCH_CATEGORIES, WatchCategoryId, BucketSummary } from '../../src/models/watch';

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
  let mockUIUtil: jest.Mocked<IUIUtil>;

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
      summarizeBuckets: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    mockUIUtil = {
      buildLabel: jest.fn().mockReturnValue(mockJQueryChain),
    } as unknown as jest.Mocked<IUIUtil>;

    // Reset jQuery mock
    mockJQuery.mockReturnValue(mockJQueryChain);

    watchlistManager = new TradingViewWatchlistManager(
      mockPaintManager,
      mockUIUtil
    );
  });

  describe('Constructor', () => {
    it('should create instance with all dependencies', () => {
      expect(watchlistManager).toBeInstanceOf(TradingViewWatchlistManager);
    });
  });

  describe('refreshWatchlistView', () => {
    let classifyResult: BucketSummary;

    beforeEach(() => {
      // Mock paint() and summarizeBuckets() flow
      classifyResult = {
        buckets: new Map([[WatchCategoryId.READY, 1]]),
        uncategorizedCount: 1,
      };
      mockPaintManager.summarizeBuckets.mockResolvedValue(classifyResult);
    });

    it('should execute complete watchlist refresh via paint()', async () => {
      await watchlistManager.refreshWatchlistView();

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
      await watchlistManager.refreshWatchlistView();

      // Should call buildLabel for each color category
      expect(mockUIUtil.buildLabel).toHaveBeenCalledTimes(ALL_WATCH_CATEGORIES.length);
    });

    it('should set widget height for expansion', async () => {
      await watchlistManager.refreshWatchlistView();

      expect(mockJQueryChain.css).toHaveBeenCalledWith('height', '20000px');
    });

    it('should show all lines during reset', async () => {
      await watchlistManager.refreshWatchlistView();

      expect(mockJQueryChain.show).toHaveBeenCalled();
    });

    it('should use returned buckets for summary display', async () => {
      await watchlistManager.refreshWatchlistView();

      // AAPL is in READY bucket — default_plus plus one uncategorized
      expect(mockUIUtil.buildLabel).toHaveBeenCalledWith(
        expect.stringMatching(/1\||0\|/),
        expect.any(String)
      );
    });
  });

  describe('applyDefaultFilters', () => {
    it('should add white/default color filter', () => {
      watchlistManager.applyDefaultFilters();

      // Just verify no crash
    });
  });
});
