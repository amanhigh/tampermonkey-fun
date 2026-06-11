import { GttPlugin } from '../../src/manager/gtt_plugin';
import { IKiteRepo } from '../../src/repo/kite';
import { ICategoryManager } from '../../src/manager/category';
import { GttRefreshEvent } from '../../src/models/gtt';
import { Order, OrderType } from '../../src/models/kite';
import { WatchCategoryId } from '../../src/models/watch';

// Unit tests for GttUnwatchedAudit: only SET_JOURNAL and RUNNING count as watched

describe('GttPlugin', () => {
  let plugin: GttPlugin;
  let kiteRepo: jest.Mocked<IKiteRepo>;
  let categoryManager: jest.Mocked<ICategoryManager>;

  beforeEach(() => {
    kiteRepo = {
      getGttRefereshEvent: jest.fn(),
    } as any;

    categoryManager = {
      getTickerCategory: jest.fn(),
      recordWatchCategory: jest.fn(),
      recordFlagCategory: jest.fn(),
    } as any;

    plugin = new GttPlugin(kiteRepo, categoryManager);
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
      categoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.SET_JOURNAL, color: 'orange', label: '', recordUpdate: null },
        flag: undefined,
        isFno: false,
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('skips ticker with RUNNING category', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('MSFT', 10, OrderType.SINGLE, '1', [100]);
      gttEvent.addOrder('MSFT', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      categoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.RUNNING, color: 'lime', label: '', recordUpdate: null },
        flag: undefined,
        isFno: false,
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for READY ticker with GTT order (not SET/RUNNING)', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('GOOGL', 10, OrderType.SINGLE, '1', [100]);
      gttEvent.addOrder('GOOGL', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      categoryManager.getTickerCategory.mockResolvedValue({
        watch: { id: WatchCategoryId.READY, color: 'red', label: '', recordUpdate: { state: 'READY' } },
        flag: undefined,
        isFno: false,
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        code: 'UNWATCHED_GTT',
        target: 'GOOGL',
        severity: 'HIGH',
      });
    });

    it('emits FAIL for uncategorized ticker with GTT order', async () => {
      const gttEvent = new GttRefreshEvent();
      const mockOrder = new Order('TSLA', 10, OrderType.SINGLE, '1', [100]);
      gttEvent.addOrder('TSLA', mockOrder);

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      categoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined, isFno: false });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        code: 'UNWATCHED_GTT',
        target: 'TSLA',
      });
    });

    it('handles multiple GTT tickers with mixed categories', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('WATCHED', new Order('WATCHED', 10, OrderType.SINGLE, '1', [100]));
      gttEvent.addOrder('UNWATCHED', new Order('UNWATCHED', 10, OrderType.SINGLE, '1', [100]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      categoryManager.getTickerCategory.mockImplementation(async (ticker: string) => {
        if (ticker === 'WATCHED') return { watch: { id: WatchCategoryId.RUNNING, color: 'lime', label: '', recordUpdate: null }, flag: undefined, isFno: false };
        return { watch: undefined, flag: undefined, isFno: false };
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('UNWATCHED');
    });

    it('uses correct order ids from GTT event', async () => {
      const gttEvent = new GttRefreshEvent();
      gttEvent.addOrder('TICK', new Order('TICK', 15, OrderType.SINGLE, 'order123', [150]));
      gttEvent.addOrder('TICK', new Order('TICK', 20, OrderType.SINGLE, 'order456', [200]));

      kiteRepo.getGttRefereshEvent.mockResolvedValue(gttEvent);
      categoryManager.getTickerCategory.mockResolvedValue({ watch: undefined, flag: undefined, isFno: false });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0]?.data?.orderIds).toEqual(['order123', 'order456']);
    });
  });
});
