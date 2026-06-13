import { WatchListHandler, IWatchListHandler } from '../../src/handler/watchlist';
import { ITradingViewWatchlistManager } from '../../src/manager/watchlist';
import { IPaintManager } from '../../src/manager/paint';
import { ISyncUtil } from '../../src/util/sync';
import { ICategoryManager } from '../../src/manager/category';
import { IDomManager } from '../../src/manager/dom';
import { IAlertFeedManager } from '../../src/manager/alertfeed';
import { IAlertTickerManager } from '../../src/manager/alert_ticker';
import { AlertTicker } from '../../src/models/alert_ticker';
import { WatchCategoryId } from '../../src/models/watch';

describe('WatchListHandler', () => {
  let handler: IWatchListHandler;
  let mockWatchlistManager: jest.Mocked<ITradingViewWatchlistManager>;
  let mockPaintManager: jest.Mocked<IPaintManager>;
  let mockSyncUtil: jest.Mocked<ISyncUtil>;
  let mockCategoryManager: jest.Mocked<ICategoryManager>;
  let mockDomManager: jest.Mocked<IDomManager>;
  let mockAlertFeedManager: jest.Mocked<IAlertFeedManager>;
  let mockAlertTickerManager: jest.Mocked<IAlertTickerManager>;

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
      recordWatchCategory: jest.fn().mockResolvedValue(undefined),
      recordFlagCategory: jest.fn(),
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

    mockAlertFeedManager = {
      createAlertFeedEvent: jest.fn(),
    } as unknown as jest.Mocked<IAlertFeedManager>;

    mockAlertTickerManager = {
      getPrimaryAlertTicker: jest.fn().mockResolvedValue(null),
      linkAlertTicker: jest.fn(),
      fetchAlertTicker: jest.fn(),
      getAlertTickers: jest.fn(),
      getAlertTickersForTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
    } as unknown as jest.Mocked<IAlertTickerManager>;

    handler = new WatchListHandler(
      mockWatchlistManager,
      mockPaintManager,
      mockSyncUtil,
      mockCategoryManager,
      mockDomManager,
      mockAlertFeedManager,
      mockAlertTickerManager
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

    it('should resolve alert ticker and create alert feed event when primary exists', () => {
      const alertTicker: AlertTicker = {
        symbol: 'INFY',
        pair_id: '12345',
        name: 'Infosys Ltd',
        exchange: 'NSE',
        type: 'PRIMARY',
        ticker: 'CURRENT',
        created_at: '',
        updated_at: '',
      };
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(alertTicker);

      handler.onWatchListChange();

      expect(mockAlertTickerManager.getPrimaryAlertTicker).toHaveBeenCalledWith('CURRENT');
      // Flush microtasks
      return new Promise((resolve) => setImmediate(() => {
        expect(mockAlertFeedManager.createAlertFeedEvent).toHaveBeenCalledWith(alertTicker);
        resolve(undefined);
      }));
    });

    it('should not create alert feed event when no primary alert ticker exists', () => {
      mockAlertTickerManager.getPrimaryAlertTicker.mockResolvedValue(null);

      handler.onWatchListChange();

      // Flush microtasks
      return new Promise((resolve) => setImmediate(() => {
        expect(mockAlertFeedManager.createAlertFeedEvent).not.toHaveBeenCalled();
        resolve(undefined);
      }));
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

    it('should target-paint selected tickers after category update resolves', async () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      // Wait for internal async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['SELECTED1', 'SELECTED2']);
    });

    it('should refresh summary after targeted update resolves', async () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      // Wait for internal async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWatchlistManager.refreshSummary).toHaveBeenCalled();
    });

    it('should NOT do full refresh', async () => {
      handler.recordSelectedTicker(WatchCategoryId.READY);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWatchlistManager.refresh).not.toHaveBeenCalled();
    });

    it('should not paint before recordWatchCategory resolves', async () => {
      let resolveRecord!: () => void;
      mockCategoryManager.recordWatchCategory.mockReturnValue(
        new Promise((resolve) => { resolveRecord = resolve; })
      );

      handler.recordSelectedTicker(WatchCategoryId.READY);

      // Paint should NOT be called while record is still pending
      expect(mockPaintManager.paintTickers).not.toHaveBeenCalled();
      expect(mockWatchlistManager.refreshSummary).not.toHaveBeenCalled();

      // Resolve and flush microtasks
      resolveRecord();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Paint and summary should be called after record resolves
      expect(mockPaintManager.paintTickers).toHaveBeenCalledWith(['SELECTED1', 'SELECTED2']);
      expect(mockWatchlistManager.refreshSummary).toHaveBeenCalled();
    });
  });
});
