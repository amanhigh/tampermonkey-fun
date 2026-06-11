import { WatchListHandler, IWatchListHandler } from '../../src/handler/watchlist';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { ISyncUtil } from '../../src/util/sync';
import { IWatchManager } from '../../src/manager/watch';
import { IDomManager } from '../../src/manager/dom';
import { IAlertFeedManager } from '../../src/manager/alertfeed';
import { TickerArea } from '../../src/models/dom';
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
      paintWatchList: jest.fn().mockResolvedValue(undefined),
      refreshSummaryAndFilters: jest.fn().mockResolvedValue(undefined),
      applyDefaultFilters: jest.fn(),
    } as unknown as jest.Mocked<ITradingViewWatchlistManager>;

    mockPaintManager = {
      resetArea: jest.fn(),
      paintArea: jest.fn().mockResolvedValue(undefined),
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
    it('should perform full watchlist repaint', () => {
      handler.onWatchListChange();

      expect(mockWatchlistManager.paintWatchList).toHaveBeenCalled();
    });

    it('should perform full screener repaint', () => {
      handler.onWatchListChange();

      expect(mockPaintManager.paintArea).toHaveBeenCalledWith(TickerArea.SCREENER);
    });

    it('should target-paint current ticker for header refresh', () => {
      handler.onWatchListChange();

      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['CURRENT']);
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

    it('should NOT do full paintWatchList', () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      expect(mockWatchlistManager.paintWatchList).not.toHaveBeenCalled();
    });
  });
});
