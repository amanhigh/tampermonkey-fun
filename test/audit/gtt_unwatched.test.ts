import { GttPlugin } from '../../src/manager/gtt_plugin';
import { IKiteRepo } from '../../src/repo/kite';
import { IWatchManager } from '../../src/manager/watch';
import { GttRefreshEvent } from '../../src/models/gtt';
import { Order } from '../../src/models/kite';

// Unit tests for GttUnwatchedAudit: identifies GTT orders for unwatched tickers

describe('GttPlugin', () => {
  let plugin: GttPlugin;
  let kiteRepo: jest.Mocked<IKiteRepo>;
  let watchManager: jest.Mocked<IWatchManager>;

  beforeEach(() => {
    kiteRepo = {
      getGttRefereshEvent: jest.fn(),
    } as any;

    watchManager = {
      getCategory: jest.fn(),
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

    it('returns empty array when all GTT tickers are in first watchlist (category 0)', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('AAPL', 10, 'single', '1', [100]);
      gttEvent.addOrder('AAPL', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation((index: number) => {
        if (index === 0) return new Set(['AAPL']); // Orange list
        if (index === 1) return new Set(); // Red list
        if (index === 4) return new Set(); // Running trades
        return new Set();
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(watchManager.getCategory).toHaveBeenCalledWith(0);
      expect(watchManager.getCategory).toHaveBeenCalledWith(1);
      expect(watchManager.getCategory).toHaveBeenCalledWith(4);
    });

    it('returns empty array when all GTT tickers are in second watchlist (category 1)', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('MSFT', 10, 'single', '1', [100]);
      gttEvent.addOrder('MSFT', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation((index: number) => {
        if (index === 0) return new Set(); // Orange list
        if (index === 1) return new Set(['MSFT']); // Red list
        if (index === 4) return new Set(); // Running trades
        return new Set();
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all GTT tickers are in running trades watchlist (category 4)', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('GOOGL', 10, 'single', '1', [100]);
      gttEvent.addOrder('GOOGL', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation((index: number) => {
        if (index === 0) return new Set(); // Orange list
        if (index === 1) return new Set(); // Red list
        if (index === 4) return new Set(['GOOGL']); // Running trades
        return new Set();
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for GTT ticker not in any watchlist', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('TSLA', 10, 'single', '1', [100]);
      gttEvent.addOrder('TSLA', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation((index: number) => {
        if (index === 0) return new Set(['AAPL']); // Orange list
        if (index === 1) return new Set(['MSFT']); // Red list
        if (index === 4) return new Set(['GOOGL']); // Running trades
        return new Set();
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        pluginId: 'gtt-unwatched',
        code: 'UNWATCHED_GTT',
        target: 'TSLA',
        message: 'TSLA: 1 GTT order(s) exist but ticker not in watchlist',
        severity: 'HIGH',
        status: 'FAIL',
        data: {
          orderIds: ['1'],
        },
      });
    });

    it('emits FAIL for multiple unwatched GTT tickers', async () => {
      const gttEvent = new GttRefreshEvent();
      const order1 = new Order('TSLA', 10, 'single', '1', [100]);
      const order2 = new Order('AMZN', 10, 'single', '2', [150]);
      gttEvent.addOrder('TSLA', order1);
      gttEvent.addOrder('AMZN', order2);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation(() => new Set()); // All empty

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['AMZN', 'TSLA']);

      results.forEach((result) => {
        expect(result.pluginId).toBe('gtt-unwatched');
        expect(result.code).toBe('UNWATCHED_GTT');
        expect(result.severity).toBe('HIGH');
        expect(result.status).toBe('FAIL');
      });
    });

    it('emits FAIL only for unwatched tickers when some are watched', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('AAPL', new Order('AAPL', 10, 'single', '1', [100]));
      gttEvent.addOrder('TSLA', new Order('TSLA', 10, 'single', '2', [150]));
      gttEvent.addOrder('MSFT', new Order('MSFT', 10, 'single', '3', [200]));
      gttEvent.addOrder('AMZN', new Order('AMZN', 10, 'single', '4', [250]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation((index: number) => {
        if (index === 0) return new Set(['AAPL']); // Orange list
        if (index === 1) return new Set(['MSFT']); // Red list
        if (index === 4) return new Set(); // Running trades empty
        return new Set();
      });

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['AMZN', 'TSLA']);
    });

    it('handles ticker in multiple watchlists correctly', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('AAPL', new Order('AAPL', 10, 'single', '1', [100]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation((index: number) => {
        if (index === 0) return new Set(['AAPL']); // Orange list
        if (index === 1) return new Set(['AAPL']); // Red list (also has AAPL)
        if (index === 4) return new Set(); // Running trades
        return new Set();
      });

      const results = await plugin.run();

      // Should not emit FAIL since ticker is watched (even in multiple lists)
      expect(results).toEqual([]);
    });

    it('verifies correct AuditResult structure', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('UNWATCHED', new Order('UNWATCHED', 10, 'single', '1', [100]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      watchManager.getCategory.mockImplementation(() => new Set());

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
      expect(result.message).toContain('GTT order(s) exist but ticker not in watchlist');
    });
  });
});
