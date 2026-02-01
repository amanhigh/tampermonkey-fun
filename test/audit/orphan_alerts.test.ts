import { OrphanAlertsAudit } from '../../src/audit/orphan_alerts';
import { IAlertRepo } from '../../src/repo/alert';
import { IPairRepo } from '../../src/repo/pair';
import { Alert, PairInfo } from '../../src/models/alert';

// Unit tests for OrphanAlertsAudit: identifies alerts without corresponding pairs

describe('OrphanAlertsAudit', () => {
  let plugin: OrphanAlertsAudit;
  let alertRepo: jest.Mocked<IAlertRepo>;
  let pairRepo: jest.Mocked<IPairRepo>;

  beforeEach(() => {
    alertRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
    } as any;

    pairRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
    } as any;

    plugin = new OrphanAlertsAudit(alertRepo, pairRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('orphan-alerts');
      expect(plugin.title).toBe('Orphan Alerts');
    });
  });

  describe('run', () => {
    it('returns empty array when no alerts exist', async () => {
      alertRepo.getAllKeys.mockReturnValue([]);
      pairRepo.getAllKeys.mockReturnValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(alertRepo.getAllKeys).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when all alerts have corresponding pairs', async () => {
      const alert1 = new Alert('1', 'PAIR1', 100);
      const alert2 = new Alert('2', 'PAIR2', 200);
      const pair1 = new PairInfo('Stock A', 'PAIR1', 'NSE', 'SYM1');
      const pair2 = new PairInfo('Stock B', 'PAIR2', 'NSE', 'SYM2');

      alertRepo.getAllKeys.mockReturnValue(['PAIR1', 'PAIR2']);
      alertRepo.get.mockImplementation((pairId: string) => {
        if (pairId === 'PAIR1') return [alert1];
        if (pairId === 'PAIR2') return [alert2];
        return undefined;
      });

      pairRepo.getAllKeys.mockReturnValue(['INV1', 'INV2']);
      pairRepo.get.mockImplementation((investingTicker: string) => {
        if (investingTicker === 'INV1') return pair1;
        if (investingTicker === 'INV2') return pair2;
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for single alert with no pair', async () => {
      const orphanAlert = new Alert('1', 'ORPHAN_PAIR', 100);
      const validPair = new PairInfo('Stock A', 'PAIR1', 'NSE', 'SYM1');

      alertRepo.getAllKeys.mockReturnValue(['ORPHAN_PAIR']);
      alertRepo.get.mockReturnValue([orphanAlert]);

      pairRepo.getAllKeys.mockReturnValue(['INV1']);
      pairRepo.get.mockReturnValue(validPair);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN_PAIR');
      expect(results[0].code).toBe('NO_PAIR_MAPPING');
      expect(results[0].severity).toBe('HIGH');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ pairId: 'ORPHAN_PAIR', alertCount: 1 });
    });

    it('emits FAIL for multiple orphan alerts with same pairId', async () => {
      const orphanAlert1 = new Alert('1', 'ORPHAN_PAIR', 100);
      const orphanAlert2 = new Alert('2', 'ORPHAN_PAIR', 150);
      const validPair = new PairInfo('Stock A', 'PAIR1', 'NSE', 'SYM1');

      alertRepo.getAllKeys.mockReturnValue(['ORPHAN_PAIR']);
      alertRepo.get.mockReturnValue([orphanAlert1, orphanAlert2]);

      pairRepo.getAllKeys.mockReturnValue(['INV1']);
      pairRepo.get.mockReturnValue(validPair);

      const results = await plugin.run();

      // Now returns single result per orphan pairId with alert count in data field
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN_PAIR');
      expect(results[0].code).toBe('NO_PAIR_MAPPING');
      expect(results[0].severity).toBe('HIGH');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ pairId: 'ORPHAN_PAIR', alertCount: 2 });
    });

    it('emits FAIL only for orphan alerts when some are valid', async () => {
      const validAlert = new Alert('1', 'PAIR1', 100);
      const orphanAlert = new Alert('2', 'ORPHAN_PAIR', 150);
      const pair1 = new PairInfo('Stock A', 'PAIR1', 'NSE', 'SYM1');
      const pair2 = new PairInfo('Stock B', 'PAIR2', 'NSE', 'SYM2');

      alertRepo.getAllKeys.mockReturnValue(['PAIR1', 'ORPHAN_PAIR']);
      alertRepo.get.mockImplementation((pairId: string) => {
        if (pairId === 'PAIR1') return [validAlert];
        if (pairId === 'ORPHAN_PAIR') return [orphanAlert];
        return undefined;
      });

      pairRepo.getAllKeys.mockReturnValue(['INV1', 'INV2']);
      pairRepo.get.mockImplementation((investingTicker: string) => {
        if (investingTicker === 'INV1') return pair1;
        if (investingTicker === 'INV2') return pair2;
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN_PAIR');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ pairId: 'ORPHAN_PAIR', alertCount: 1 });
    });

    it('throws error when targets provided', async () => {
      expect(() => plugin.run(['ORPHAN_PAIR'])).rejects.toThrow('does not support targeted mode');
    });

    it('throws error when empty targets array provided', async () => {
      expect(() => plugin.run([])).rejects.toThrow('does not support targeted mode');
    });

    it('skips empty alert arrays', async () => {
      alertRepo.getAllKeys.mockReturnValue(['ORPHAN_PAIR']);
      alertRepo.get.mockReturnValue([]);

      pairRepo.getAllKeys.mockReturnValue(['INV1']);
      pairRepo.get.mockReturnValue(new PairInfo('Stock A', 'PAIR1', 'NSE', 'SYM1'));

      const results = await plugin.run();

      // Empty alert arrays are reported
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN_PAIR');
      expect(results[0].data).toEqual({ pairId: 'ORPHAN_PAIR', alertCount: 0 });
    });

    it('verifies correct AuditResult structure', async () => {
      const orphanAlert = new Alert('1', 'ORPHAN_PAIR', 100);

      alertRepo.getAllKeys.mockReturnValue(['ORPHAN_PAIR']);
      alertRepo.get.mockReturnValue([orphanAlert]);

      pairRepo.getAllKeys.mockReturnValue([]);
      pairRepo.get.mockReturnValue(undefined);

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

    it('handles multiple orphans with mixed valid pairs', async () => {
      const validAlert1 = new Alert('1', 'PAIR1', 100);
      const orphanAlert1 = new Alert('2', 'ORPHAN1', 150);
      const validAlert2 = new Alert('3', 'PAIR2', 200);
      const orphanAlert2 = new Alert('4', 'ORPHAN2', 250);

      const pair1 = new PairInfo('Stock A', 'PAIR1', 'NSE', 'SYM1');
      const pair2 = new PairInfo('Stock B', 'PAIR2', 'NSE', 'SYM2');

      alertRepo.getAllKeys.mockReturnValue(['PAIR1', 'ORPHAN1', 'PAIR2', 'ORPHAN2']);
      alertRepo.get.mockImplementation((pairId: string) => {
        switch (pairId) {
          case 'PAIR1':
            return [validAlert1];
          case 'ORPHAN1':
            return [orphanAlert1];
          case 'PAIR2':
            return [validAlert2];
          case 'ORPHAN2':
            return [orphanAlert2];
        }
        return undefined;
      });

      pairRepo.getAllKeys.mockReturnValue(['INV1', 'INV2']);
      pairRepo.get.mockImplementation((investingTicker: string) => {
        if (investingTicker === 'INV1') return pair1;
        if (investingTicker === 'INV2') return pair2;
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['ORPHAN1', 'ORPHAN2']);
      // Verify data field contains metadata
      const orphan1Result = results.find((r) => r.target === 'ORPHAN1');
      expect(orphan1Result?.data).toEqual({ pairId: 'ORPHAN1', alertCount: 1 });
      const orphan2Result = results.find((r) => r.target === 'ORPHAN2');
      expect(orphan2Result?.data).toEqual({ pairId: 'ORPHAN2', alertCount: 1 });
    });
  });
});
