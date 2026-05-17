import { OrphanAlertsPlugin } from '../../src/manager/orphan_alerts_plugin';
import { IAlertRepo } from '../../src/repo/alert';
import { IAlertTickerClient } from '../../src/client/alert_ticker';
import { Alert, PairInfo } from '../../src/models/alert';
import { AlertTicker } from '../../src/models/alert_ticker';

// Unit tests for OrphanAlertsAudit: identifies alerts without corresponding pairs

describe('OrphanAlertsPlugin', () => {
  let plugin: OrphanAlertsPlugin;
  let alertRepo: jest.Mocked<IAlertRepo>;
  let alertTickerClient: jest.Mocked<IAlertTickerClient>;

  beforeEach(() => {
    alertRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
    } as any;

    alertTickerClient = {
      listAlertTickers: jest.fn(),
      getAlertTicker: jest.fn(),
      createAlertTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
    } as any;

    plugin = new OrphanAlertsPlugin(alertRepo, alertTickerClient);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('orphan-alerts');
      expect(plugin.title).toBe('Alerts');
    });
  });

  describe('run', () => {
    it('returns empty array when no alerts exist', async () => {
      alertRepo.getAllKeys.mockReturnValue([]);
      alertTickerClient.listAlertTickers.mockResolvedValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(alertRepo.getAllKeys).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when all alerts have corresponding alert tickers', async () => {
      const alert1 = new Alert('1', 'PAIR1', 100);
      const alert2 = new Alert('2', 'PAIR2', 200);

      alertRepo.getAllKeys.mockReturnValue(['PAIR1', 'PAIR2']);
      alertRepo.get.mockImplementation((pairId: string) => {
        if (pairId === 'PAIR1') return [alert1];
        if (pairId === 'PAIR2') return [alert2];
        return undefined;
      });

      alertTickerClient.listAlertTickers.mockResolvedValue([
        { pair_id: 'PAIR1' } as AlertTicker,
        { pair_id: 'PAIR2' } as AlertTicker,
      ]);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for single alert with no pair', async () => {
      const orphanAlert = new Alert('1', 'ORPHAN_PAIR', 100);

      alertRepo.getAllKeys.mockReturnValue(['ORPHAN_PAIR']);
      alertRepo.get.mockReturnValue([orphanAlert]);

      alertTickerClient.listAlertTickers.mockResolvedValue([
        { pair_id: 'PAIR1' } as AlertTicker,
      ]);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN_PAIR');
      expect(results[0].code).toBe('NO_PAIR_MAPPING');
      expect(results[0].severity).toBe('HIGH');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ pairId: 'ORPHAN_PAIR', alertName: 'ORPHAN_PAIR', alertCount: 1 });
    });

    it('emits FAIL only for orphan alerts when some are valid', async () => {
      const validAlert = new Alert('1', 'PAIR1', 100);
      const orphanAlert = new Alert('2', 'ORPHAN_PAIR', 150);

      alertRepo.getAllKeys.mockReturnValue(['PAIR1', 'ORPHAN_PAIR']);
      alertRepo.get.mockImplementation((pairId: string) => {
        if (pairId === 'PAIR1') return [validAlert];
        if (pairId === 'ORPHAN_PAIR') return [orphanAlert];
        return undefined;
      });

      alertTickerClient.listAlertTickers.mockResolvedValue([
        { pair_id: 'PAIR1' } as AlertTicker,
      ]);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN_PAIR');
      expect(results[0].status).toBe('FAIL');
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['ORPHAN_PAIR'])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      const orphanAlert = new Alert('1', 'ORPHAN_PAIR', 100);

      alertRepo.getAllKeys.mockReturnValue(['ORPHAN_PAIR']);
      alertRepo.get.mockReturnValue([orphanAlert]);
      alertTickerClient.listAlertTickers.mockResolvedValue([]);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toHaveProperty('pluginId');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('status');

      expect(result.pluginId).toBe('orphan-alerts');
      expect(result.code).toBe('NO_PAIR_MAPPING');
      expect(result.severity).toBe('HIGH');
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('ORPHAN_PAIR');
      expect(result.message).toContain('pair');
    });
  });
});
