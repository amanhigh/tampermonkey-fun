import { WatchListHandler, IWatchListHandler } from '../../src/handler/watchlist';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { ISyncUtil } from '../../src/util/sync';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { WatchCategoryId } from '../../src/models/watch';
import { ISubscriber } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';

describe('WatchListHandler', () => {
  let handler: IWatchListHandler;
  let mockWatchlistManager: jest.Mocked<ITradingViewWatchlistManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockSyncUtil: jest.Mocked<ISyncUtil>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockDomManager: jest.Mocked<IDomManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWatchlistManager = {
      refresh: jest.fn().mockResolvedValue(undefined),
      refreshSummary: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ITradingViewWatchlistManager>;

    mockPaintManager = {
      paint: jest.fn().mockResolvedValue(undefined),
      paintTickers: jest.fn().mockResolvedValue(undefined),
      summarizeBuckets: jest.fn(),
    } as unknown as jest.Mocked<IPaintManager>;

    mockSyncUtil = {
      waitOn: jest.fn((_key, _delay, callback) => {
        callback();
      }),
    } as unknown as jest.Mocked<ISyncUtil>;

    mockCategoryManager = {
      getTickerCategory: jest.fn(),
      evictTicker: jest.fn(),
      recordWatchCategory: jest.fn().mockResolvedValue(undefined),
      recordFlagCategory: jest.fn(),
      clearReadyState: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ICategoryManager>;

    mockDomManager = {
      getTicker: jest.fn().mockReturnValue('CURRENT'),
      isScreenerVisible: jest.fn().mockReturnValue(false),
      getTickers: jest.fn().mockReturnValue(new Set()),
      getCurrentExchange: jest.fn(),
      getInvestingTicker: jest.fn(),
      openTicker: jest.fn(),
      openBenchmarkTicker: jest.fn(),
      navigateTickers: jest.fn(),
    } as unknown as jest.Mocked<IDomManager>;

    handler = new WatchListHandler(
      mockWatchlistManager,
      mockPaintManager,
      mockSyncUtil,
      mockCategoryManager,
      mockDomManager
    );
  });

  describe('onWatchListChange', () => {
    it('should delegate to refresh for full refresh', () => {
      handler.onWatchListChange();

      expect(mockWatchlistManager.refresh).toHaveBeenCalled();
    });

    it('should no longer call paint directly', () => {
      handler.onWatchListChange();

      expect(mockPaintManager.paint).not.toHaveBeenCalled();
    });

    it('should no longer call paintTickers for header refresh directly', () => {
      handler.onWatchListChange();

      expect(mockPaintManager.paintTickers).not.toHaveBeenCalled();
    });

    it('should no longer call alert feed directly', () => {
      handler.onWatchListChange();

      // Alert feed updates are now handled via WATCHLIST_CHANGED event
      expect(mockDomManager.getTicker).not.toHaveBeenCalled();
    });
  });

  describe('recordSelectedTicker', () => {
    beforeEach(() => {
      mockDomManager.getTickers.mockReturnValue(new Set(['SELECTED1', 'SELECTED2']));
    });

    it('should record selected tickers in watch category', () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      expect(mockCategoryManager.recordWatchCategory).toHaveBeenCalledWith(
        WatchCategoryId.READY,
        ['SELECTED1', 'SELECTED2']
      );
    });

    it('should NOT do full refresh', async () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWatchlistManager.refresh).not.toHaveBeenCalled();
    });
  });

  describe('registerEvents', () => {
    it('should subscribe to TICKER_TIMEFRAMES_CHANGED', () => {
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockSubscriber);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(
        DomainEventType.TICKER_TIMEFRAMES_CHANGED,
        expect.any(Function)
      );
    });

    it('should evict category cache, repaint ticker, and refresh summary on TICKER_TIMEFRAMES_CHANGED', async () => {
      let timeframeCallback: Function | undefined;
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn((type, cb) => {
          if (type === DomainEventType.TICKER_TIMEFRAMES_CHANGED) {
            timeframeCallback = cb;
          }
        }),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockSubscriber);
      await timeframeCallback!({ type: DomainEventType.TICKER_TIMEFRAMES_CHANGED, ticker: 'TV:INFY' });

      expect(mockCategoryManager.evictTicker).toHaveBeenCalledWith('TV:INFY');
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['TV:INFY']);
      expect(mockWatchlistManager.refreshSummary).toHaveBeenCalled();
    });
  });
});
