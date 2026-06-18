import { WatchListHandler, IWatchListHandler } from '../../src/handler/watchlist';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { ISyncUtil } from '../../src/util/sync';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { WatchCategoryId } from '../../src/models/watch';
import { TickerArea, TickerVisibility } from '../../src/models/dom';
import { ISubscriber } from '../../src/manager/event_bus';
import { DomainEventType } from '../../src/models/domain_event';

// Mock jQuery for extractChangedTickers (uses $(node).find / $(node).is)
const mockJQueryElement: any = {
  find: jest.fn().mockReturnValue({ each: jest.fn() }),
  is: jest.fn().mockReturnValue(false),
  length: 0,
};
const mockJQuery = jest.fn().mockReturnValue(mockJQueryElement);
(global as any).$ = mockJQuery;

/** Create a fake MutationRecord with the given added/removed nodes. */
function mockMutation(nodes: Node[], removed: Node[]): MutationRecord {
  // MutationRecord.addedNodes/removedNodes are NodeList — cast from array
  return {
    type: 'childList',
    addedNodes: nodes as unknown as NodeList,
    removedNodes: removed as unknown as NodeList,
  } as unknown as MutationRecord;
}

describe('WatchListHandler', () => {
  let handler: IWatchListHandler;
  let mockWatchlistManager: jest.Mocked<ITradingViewWatchlistManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockSyncUtil: jest.Mocked<ISyncUtil>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockDomManager: jest.Mocked<IDomManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset jQuery mock for each test
    mockJQueryElement.find = jest.fn().mockReturnValue({ each: jest.fn() });
    mockJQueryElement.is = jest.fn().mockReturnValue(false);
    mockJQuery.mockReturnValue(mockJQueryElement);

    mockWatchlistManager = {
      refresh: jest.fn().mockResolvedValue(undefined),
      refreshSummary: jest.fn().mockResolvedValue(undefined),
      refreshTickers: jest.fn().mockResolvedValue(undefined),
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
    it('should delegate to refresh for full refresh when no mutations are supplied', () => {
      handler.onWatchListChange();

      expect(mockWatchlistManager.refresh).toHaveBeenCalled();
      expect(mockWatchlistManager.refreshTickers).not.toHaveBeenCalled();
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

    it('should error when extractChangedTickers returns empty tickers', () => {
      // jQuery.find.each returns no tickers (never calls the each callback)
      mockJQueryElement.find.mockReturnValue({ each: jest.fn((cb) => cb(0, { textContent: '' })) });

      handler.onWatchListChange([mockMutation([document.createElement('div')], [])]);

      expect(mockWatchlistManager.refresh).toHaveBeenCalled();
      expect(mockWatchlistManager.refreshTickers).not.toHaveBeenCalled();
    });

    it('should route to targeted refreshTickers when exactly one ticker is added', () => {
      // Simulate a single added ticker row with "AMGN" in the symbol text
      const eachMock = jest.fn((cb: (i: number, el: Element) => void) => {
        cb(0, { textContent: 'AMGN' } as Element);
      });
      mockJQueryElement.find.mockReturnValue({ each: eachMock });

      handler.onWatchListChange([mockMutation([document.createElement('div')], [])]);

      expect(mockWatchlistManager.refreshTickers).toHaveBeenCalledWith(['AMGN']);
      expect(mockWatchlistManager.refresh).not.toHaveBeenCalled();
    });

    it('should route to targeted refreshTickers when exactly one ticker is removed', () => {
      const eachMock = jest.fn((cb: (i: number, el: Element) => void) => {
        cb(0, { textContent: 'GOOGL' } as Element);
      });
      mockJQueryElement.find.mockReturnValue({ each: eachMock });

      handler.onWatchListChange([mockMutation([], [document.createElement('div')])]);

      expect(mockWatchlistManager.refreshTickers).toHaveBeenCalledWith(['GOOGL']);
      expect(mockWatchlistManager.refresh).not.toHaveBeenCalled();
    });

    it('should fall back to full refresh for multiple extracted tickers', () => {
      // Simulate both an add and remove in the same batch
      const eachMock = jest.fn((cb: (i: number, el: Element) => void) => {
        cb(0, { textContent: 'AMGN' } as Element);
      });
      mockJQueryElement.find.mockReturnValue({ each: eachMock });
      // Two mutation records both yield "AMGN" (de-duplicated to 1), but...
      // Actually two separate mutations with same ticker still yields 1 unique ticker.
      // Let's simulate two different tickers instead.
      const eachMock2 = jest.fn((cb: (i: number, el: Element) => void) => {
        cb(0, { textContent: 'AMGN' } as Element);
        cb(1, { textContent: 'GOOGL' } as Element);
      });
      mockJQueryElement.find.mockReturnValue({ each: eachMock2 });

      handler.onWatchListChange([mockMutation([document.createElement('div')], [])]);

      expect(mockWatchlistManager.refresh).toHaveBeenCalled();
      expect(mockWatchlistManager.refreshTickers).not.toHaveBeenCalled();
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
    beforeEach(() => {
      mockDomManager.getTickers.mockReturnValue(new Set(['SEL_A', 'SEL_B']));
    });

    it('should toggle selected watchlist tickers through CategoryManager', () => {
      handler.toggleReadyForSelectedTickers();

      expect(mockCategoryManager.toggleReadyState).toHaveBeenCalledWith(['SEL_A', 'SEL_B']);
    });

    it('should use screener selected tickers when screener is visible', () => {
      mockDomManager.isScreenerVisible.mockReturnValue(true);

      handler.toggleReadyForSelectedTickers();

      expect(mockDomManager.getTickers).toHaveBeenCalledWith(
        TickerArea.SCREENER,
        TickerVisibility.SELECTED
      );
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
  });
});
