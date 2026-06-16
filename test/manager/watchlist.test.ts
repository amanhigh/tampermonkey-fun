import { TradingViewWatchlistManager, ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { IUIUtil } from '../../src/util/ui';
import { IDomManager } from '../../src/manager/dom';
import { IPublisher } from '../../src/manager/event_bus';
import { Constants } from '../../src/models/constant';
import { ALL_WATCH_CATEGORIES, WatchCategoryId, BucketSummary } from '../../src/models/watch';
import { DomainEventType } from '../../src/models/domain_event';

// Mock GM global
(global as any).GM = {
  setValue: jest.fn().mockResolvedValue(undefined),
};

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
      summarizeBuckets: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    mockUIUtil = {
      buildLabel: jest.fn().mockReturnValue(mockJQueryChain),
    } as unknown as jest.Mocked<IUIUtil>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT_TICKER'),
      getTickers: jest.fn().mockReturnValue(new Set(['AAPL', 'GOOGL', 'MSFT'])),
    } as unknown as jest.Mocked<IDomManager>;

    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPublisher>;

    // Reset jQuery mock
    mockJQuery.mockReturnValue(mockJQueryChain);

    watchlistManager = new TradingViewWatchlistManager(
      mockPaintManager,
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

    it('should publish WATCHLIST_CHANGED with current ticker after refresh', async () => {
      await watchlistManager.refresh();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        type: DomainEventType.WATCHLIST_CHANGED,
        ticker: 'CURRENT_TICKER',
      });
    });

    it('should persist all DOM watchlist tickers to Constants.STORAGE.SILOS.WATCHLIST', async () => {
      const expectedTickers = new Set(['AAPL', 'GOOGL', 'MSFT']);
      mockDomManager.getTickers.mockReturnValue(expectedTickers);

      await watchlistManager.refresh();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'WATCHLIST' }),
        expect.anything()
      );
      expect(global.GM.setValue).toHaveBeenCalledWith(
        Constants.STORAGE.SILOS.WATCHLIST,
        JSON.stringify({ tickers: ['AAPL', 'GOOGL', 'MSFT'] })
      );
    });
  });
});
