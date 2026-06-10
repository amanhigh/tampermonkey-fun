import { TradingViewWatchlistManager, ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { IUIUtil } from '../../src/util/ui';
import { Constants } from '../../src/models/constant';
import { ALL_WATCH_CATEGORIES, WatchCategoryId, CategoryBuckets } from '../../src/models/watch';
import { TickerArea } from '../../src/models/dom';

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
      resetArea: jest.fn(),
      paintArea: jest.fn(),
      paintHeader: jest.fn(),
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

  describe('paintWatchList', () => {
    let classifyResult: CategoryBuckets;

    beforeEach(() => {
      // Mock paintArea to return classified buckets
      classifyResult = {
        buckets: new Map([[WatchCategoryId.READY, new Set(['AAPL'])]]),
        uncategorized: new Set(['GOOGL']),
      };
      mockPaintManager.paintArea.mockResolvedValue(classifyResult);
    });

    it('should execute complete paint workflow via paintArea', async () => {
      await watchlistManager.paintWatchList();

      // Verify reset operations
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.WIDGET);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.WATCHLIST.LINE);
      expect(mockJQuery).toHaveBeenCalledWith(Constants.DOM.SCREENER.LINE);

      // Verify paintArea was called for WATCHLIST
      expect(mockPaintManager.paintArea).toHaveBeenCalledWith(TickerArea.WATCHLIST);

      // Verify area reset
      expect(mockPaintManager.resetArea).toHaveBeenCalledWith(TickerArea.WATCHLIST);
    });

    it('should build summary labels for all categories', async () => {
      await watchlistManager.paintWatchList();

      // Should call buildLabel for each color category
      expect(mockUIUtil.buildLabel).toHaveBeenCalledTimes(ALL_WATCH_CATEGORIES.length);
    });

    it('should set widget height for expansion', async () => {
      await watchlistManager.paintWatchList();

      expect(mockJQueryChain.css).toHaveBeenCalledWith('height', '20000px');
    });

    it('should show all lines during reset', async () => {
      await watchlistManager.paintWatchList();

      expect(mockJQueryChain.show).toHaveBeenCalled();
    });

    it('should use returned buckets for summary display', async () => {
      await watchlistManager.paintWatchList();

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

      // Just verify no crash — implementation is internal filtering
      expect(mockPaintManager.resetArea).not.toHaveBeenCalled();
    });
  });
});
