import { TradeRiskPlugin } from '../../src/manager/trade_risk_plugin';
import { IKiteRepo } from '../../src/repo/kite';
import { GttRefreshEvent } from '../../src/models/gtt';
import { Order } from '../../src/models/kite';

describe('TradeRiskPlugin', () => {
  let plugin: TradeRiskPlugin;
  let kiteRepo: jest.Mocked<IKiteRepo>;

  beforeEach(() => {
    kiteRepo = {
      getGttRefereshEvent: jest.fn(),
    } as any;

    plugin = new TradeRiskPlugin(kiteRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('trade-risk');
      expect(plugin.title).toBe('Trade Risk Multiple');
    });
  });

  describe('run', () => {
    it('returns empty array when no GTT orders exist', async () => {
      const event = new GttRefreshEvent();
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when risk matches full limit (6400)', async () => {
      const event = new GttRefreshEvent();
      // entry=100, stop=84, qty=400 => risk = |100-84| * 400 = 6400
      const buyOrder = new Order('HDFC', 400, 'single', 'buy1', [100]);
      const ocoOrder = new Order('HDFC', 400, 'two-leg', 'oco1', [84, 120]);
      event.orders = { HDFC: [buyOrder, ocoOrder] };
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when risk matches half limit (3200)', async () => {
      const event = new GttRefreshEvent();
      // entry=100, stop=84, qty=200 => risk = |100-84| * 200 = 3200
      const buyOrder = new Order('TCS', 200, 'single', 'buy1', [100]);
      const ocoOrder = new Order('TCS', 200, 'two-leg', 'oco1', [84, 120]);
      event.orders = { TCS: [buyOrder, ocoOrder] };
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('allows ±1% tolerance on risk', async () => {
      const event = new GttRefreshEvent();
      // entry=100, stop=84, qty=398 => risk = 16 * 398 = 6368 (within 1% of 6400)
      const buyOrder = new Order('INFY', 398, 'single', 'buy1', [100]);
      const ocoOrder = new Order('INFY', 398, 'two-leg', 'oco1', [84, 120]);
      event.orders = { INFY: [buyOrder, ocoOrder] };
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for non-standard risk multiple', async () => {
      const event = new GttRefreshEvent();
      // entry=100, stop=90, qty=300 => risk = 10 * 300 = 3000 (not 3200 or 6400)
      const buyOrder = new Order('SBIN', 300, 'single', 'buy1', [100]);
      const ocoOrder = new Order('SBIN', 300, 'two-leg', 'oco1', [90, 120]);
      event.orders = { SBIN: [buyOrder, ocoOrder] };
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('SBIN');
      expect(results[0].code).toBe('INVALID_RISK_MULTIPLE');
      expect(results[0].severity).toBe('HIGH');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toMatchObject({
        tvTicker: 'SBIN',
        orderId: 'oco1',
        entry: 100,
        stop: 90,
        quantity: 300,
        computedRisk: 3000,
      });
    });

    it('skips two-leg orders without corresponding single-leg buy order', async () => {
      const event = new GttRefreshEvent();
      // Only OCO order, no buy order
      const ocoOrder = new Order('LT', 100, 'two-leg', 'oco1', [90, 120]);
      event.orders = { LT: [ocoOrder] };
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('skips single-leg orders (only checks two-leg OCO)', async () => {
      const event = new GttRefreshEvent();
      const buyOrder = new Order('ITC', 100, 'single', 'buy1', [200]);
      event.orders = { ITC: [buyOrder] };
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('handles multiple tickers with mixed compliance', async () => {
      const event = new GttRefreshEvent();
      // HDFC: valid risk (6400)
      const hdfcBuy = new Order('HDFC', 400, 'single', 'buy1', [100]);
      const hdfcOco = new Order('HDFC', 400, 'two-leg', 'oco1', [84, 120]);
      // SBIN: invalid risk (3000)
      const sbinBuy = new Order('SBIN', 300, 'single', 'buy2', [100]);
      const sbinOco = new Order('SBIN', 300, 'two-leg', 'oco2', [90, 120]);
      event.orders = {
        HDFC: [hdfcBuy, hdfcOco],
        SBIN: [sbinBuy, sbinOco],
      };
      kiteRepo.getGttRefereshEvent.mockResolvedValue(event);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('SBIN');
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['HDFC'])).rejects.toThrow('does not support targeted mode');
    });
  });
});
