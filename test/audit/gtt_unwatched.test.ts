import { GttPlugin } from '../../src/manager/gtt_plugin';
import { IKiteRepo } from '../../src/repo/kite';
import { IWatchManager } from '../../src/manager/watch';
import { GttRefreshEvent } from '../../src/models/gtt';
import { Order, OrderType } from '../../src/models/kite';
import { WatchCategoryId } from '../../src/models/watch';

// Unit tests for GttUnwatchedAudit: only SET_JOURNAL and RUNNING_JOURNAL count as watched

describe('GttPlugin', () => {
  let plugin: GttPlugin;
  let kiteRepo: jest.Mocked<IKiteRepo>;
  let watchManager: jest.Mocked<IWatchManager>;

  const makeCategoryMap = (watched: Record<string, WatchCategoryId>) => {
    const map = new Map<string, any>();
    for (const [ticker, id] of Object.entries(watched)) {
      map.set(ticker, { id, color: 'orange' });
    }
    return map;
  };

  beforeEach(() => {
    kiteRepo = {
      getGttRefereshEvent: jest.fn(),
    } as any;

    watchManager = {
      getTickerCategories: jest.fn(),
      getTickerCategory: jest.fn(),
      recordCategory: jest.fn(),
    } as any;

    plugin = new GttPlugin(kiteRepo, watchManager);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('gtt-unwatched');
      expect(plugin.title).toBe('GTT Unwatched Orders');
    });
  });

  describe('run', () => {
    it('returns empty array when no GTT orders exist', async () => {
      const emptyGttEvent = new GttRefreshEvent();
      kiteRepo.getGttRefereshEvent.mockResolvedValue(emptyGttEvent);

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(kiteRepo.getGttRefereshEvent).toHaveBeenCalledTimes(1);
    });

    it('skips ticker with SET_JOURNAL category', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('AAPL', 10, OrderType.SINGLE, '1', [100]);
      gttEvent.addOrder('AAPL', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(
        makeCategoryMap({ AAPL: WatchCategoryId.SET_JOURNAL })
      );

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('skips ticker with RUNNING_JOURNAL category', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('MSFT', 10, OrderType.SINGLE, '1', [100]);
      gttEvent.addOrder('MSFT', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(
        makeCategoryMap({ MSFT: WatchCategoryId.RUNNING_JOURNAL })
      );

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for READY ticker with GTT order', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('GOOGL', 10, OrderType.SINGLE, '1', [100]);
      gttEvent.addOrder('GOOGL', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(
        makeCategoryMap({ GOOGL: WatchCategoryId.READY })
      );

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('GOOGL');
    });

    it('emits FAIL for unwatched GTT ticker', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('TSLA', 10, OrderType.SINGLE, '1', [100]);
      gttEvent.addOrder('TSLA', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(new Map());

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        pluginId: 'gtt-unwatched',
        code: 'UNWATCHED_GTT',
        target: 'TSLA',
        message: 'TSLA: 1 GTT order(s) exist but ticker not in SET/RUNNING watchlist',
        severity: 'HIGH',
        status: 'FAIL',
        data: {
          orderIds: ['1'],
        },
      });
    });

    it('emits FAIL for multiple unwatched GTT tickers', async () => {
      const gttEvent = new GttRefreshEvent();
      const order1 = new Order('TSLA', 10, OrderType.SINGLE, '1', [100]);
      const order2 = new Order('AMZN', 10, OrderType.SINGLE, '2', [150]);
      gttEvent.addOrder('TSLA', order1);
      gttEvent.addOrder('AMZN', order2);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(new Map());

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['AMZN', 'TSLA']);
    });

    it('emits FAIL for ticker in non-journal category (e.g. INDEX)', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('NIFTY', new Order('NIFTY', 10, OrderType.SINGLE, '1', [100]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(
        makeCategoryMap({ NIFTY: WatchCategoryId.INDEX })
      );

      const results = await plugin.run();

      // INDEX is NOT SET/RUNNING, so it emits FAIL
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('NIFTY');
    });

    it('emits FAIL only for unwatched tickers when some are in watched categories', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('AAPL', new Order('AAPL', 10, OrderType.SINGLE, '1', [100]));
      gttEvent.addOrder('TSLA', new Order('TSLA', 10, OrderType.SINGLE, '2', [150]));
      gttEvent.addOrder('MSFT', new Order('MSFT', 10, OrderType.SINGLE, '3', [200]));
      gttEvent.addOrder('AMZN', new Order('AMZN', 10, OrderType.SINGLE, '4', [250]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(
        makeCategoryMap({
          AAPL: WatchCategoryId.SET_JOURNAL,
          MSFT: WatchCategoryId.RUNNING_JOURNAL,
        })
      );

      const results = await plugin.run();

      // AAPL (SET) and MSFT (RUNNING) should be skipped
      // TSLA and AMZN should be flagged
      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['AMZN', 'TSLA']);
    });

    it('verifies correct AuditResult structure', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('UNWATCHED', new Order('UNWATCHED', 10, OrderType.SINGLE, '1', [100]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getTickerCategories.mockResolvedValue(new Map());

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toHaveProperty('pluginId');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('status');
      expect(result.message).toContain('UNWATCHED');
    });
  });
});
