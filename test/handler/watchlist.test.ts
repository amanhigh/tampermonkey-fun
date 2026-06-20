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
      refreshChangedTickers: jest.fn().mockResolvedValue(undefined),
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
      toggleReadyState: jest.fn().mockResolvedValue(undefined),
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
    it('should delegate debounced change to refreshChangedTickers', () => {
      handler.onWatchListChange();

      expect(mockWatchlistManager.refreshChangedTickers).toHaveBeenCalled();
      expect(mockWatchlistManager.refresh).not.toHaveBeenCalled();
    });

    it('should no longer call paint directly', () => {
      handler.onWatchListChange();

      expect(mockPaintManager.paint).not.toHaveBeenCalled();
    });

    it('should no longer call paintTickers directly', () => {
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

  describe('toggleReadyForSelectedTickers', () => {
    it('should toggle current chart ticker through CategoryManager', async () => {
      mockDomManager.getTicker.mockReturnValue('SYK');

      handler.toggleReadyForSelectedTickers();

      // toggleReadyState is fire-and-forget, flush microtasks
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCategoryManager.toggleReadyState).toHaveBeenCalledWith('SYK');
    });

    it('should use getTicker (current chart ticker) as the source', () => {
      handler.toggleReadyForSelectedTickers();

      expect(mockDomManager.getTicker).toHaveBeenCalled();
    });

    it('should NOT do full refresh', async () => {
      handler.toggleReadyForSelectedTickers();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWatchlistManager.refresh).not.toHaveBeenCalled();
    });
  });

  describe('registerEvents', () => {
    it('should subscribe to TICKER_TIMEFRAMES_CHANGED separately (eviction logic)', () => {
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

    it('should include TICKER_CATEGORY_CHANGED in subscribeMany (no separate subscribe)', () => {
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn(),
      };

      handler.registerEvents(mockSubscriber);

      // TICKER_CATEGORY_CHANGED is in subscribeMany, not a separate subscribe
      expect(mockSubscriber.subscribeMany).toHaveBeenCalledWith(
        expect.arrayContaining([DomainEventType.TICKER_CATEGORY_CHANGED]),
        expect.any(Function)
      );
      expect(mockSubscriber.subscribe).not.toHaveBeenCalledWith(
        DomainEventType.TICKER_CATEGORY_CHANGED,
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

    it('should repaint ticker and refresh summary on TICKER_CATEGORY_CHANGED (no cache eviction by handler)', async () => {
      let categoryChangedCallback: Function | undefined;
      const mockSubscriber: jest.Mocked<ISubscriber> = {
        subscribe: jest.fn(),
        subscribeMany: jest.fn((types, cb) => {
          if (types.includes(DomainEventType.TICKER_CATEGORY_CHANGED)) {
            categoryChangedCallback = cb;
          }
        }),
      };

      handler.registerEvents(mockSubscriber);
      await categoryChangedCallback!({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: ['TV:INFY'],
      });

      // Handler no longer evicts cache — CategoryManager handles that internally
      expect(mockCategoryManager.evictTicker).not.toHaveBeenCalled();
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['TV:INFY']);
      expect(mockWatchlistManager.refreshSummary).toHaveBeenCalled();
    });
  });
});
