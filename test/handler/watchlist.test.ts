import { WatchListHandler, IWatchListHandler } from '../../src/handler/watchlist';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { ISyncUtil } from '../../src/util/sync';
import { IWatchManager } from '../../src/manager/watch';
import { IDomManager } from '../../src/manager/dom';
import { IAlertFeedManager } from '../../src/manager/alertfeed';
import { WatchCategoryId } from '../../src/models/watch';

describe('WatchListHandler', () => {
  let handler: IWatchListHandler;
  let mockWatchlistManager: jest.Mocked<ITradingViewWatchlistManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockSyncUtil: jest.Mocked<ISyncUtil>;
  let mockWatchManager: jest.Mocked<IWatchManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockAlertFeedManager: jest.Mocked<IAlertFeedManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWatchlistManager = {
      refreshWatchlistView: jest.fn().mockResolvedValue(undefined),
      refreshSummaryAndFilters: jest.fn().mockResolvedValue(undefined),
      applyDefaultFilters: jest.fn(),
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

    mockWatchManager = {
      getTickerCategory: jest.fn(),
      recordCategory: jest.fn(),
    } as unknown as jest.Mocked<IWatchManager>;

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

    mockAlertFeedManager = {
      createAlertFeedEvent: jest.fn(),
    } as unknown as jest.Mocked<IAlertFeedManager>;

    handler = new WatchListHandler(
      mockWatchlistManager,
      mockPaintManager,
      mockSyncUtil,
      mockWatchManager,
      mockDomManager,
      mockAlertFeedManager
    );
  });

  describe('onWatchListChange', () => {
    it('should delegate to refreshWatchlistView for full refresh', () => {
      handler.onWatchListChange();

      expect(mockWatchlistManager.refreshWatchlistView).toHaveBeenCalled();
    });

    it('should no longer call paintArea directly', () => {
      handler.onWatchListChange();

      expect(mockPaintManager.paint).not.toHaveBeenCalled();
    });

    it('should no longer call paintTickers for header refresh directly', () => {
      handler.onWatchListChange();

      expect(mockPaintManager.paintTickers).not.toHaveBeenCalled();
    });
  });

  describe('recordSelectedTicker', () => {
    beforeEach(() => {
      mockDomManager.getTickers.mockReturnValue(new Set(['SELECTED1', 'SELECTED2']));
    });

    it('should record selected tickers in watch category', () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      expect(mockWatchManager.recordCategory).toHaveBeenCalledWith(
        WatchCategoryId.READY,
        ['SELECTED1', 'SELECTED2']
      );
    });

    it('should target-paint selected tickers', () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['SELECTED1', 'SELECTED2']);
    });

    it('should refresh summary and filters after targeted update', () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      expect(mockWatchlistManager.refreshSummaryAndFilters).toHaveBeenCalled();
    });

    it('should NOT do full refreshWatchlistView', () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      expect(mockWatchlistManager.refreshWatchlistView).not.toHaveBeenCalled();
    });
  });
});
