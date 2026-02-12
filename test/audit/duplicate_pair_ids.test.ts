import { DuplicatePairIdsPlugin } from '../../src/manager/duplicate_pair_ids_plugin';
import { IPairRepo } from '../../src/repo/pair';
import { PairInfo } from '../../src/models/alert';

describe('DuplicatePairIdsPlugin', () => {
  let plugin: DuplicatePairIdsPlugin;
  let pairRepo: jest.Mocked<IPairRepo>;

  beforeEach(() => {
    pairRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
    } as any;

    plugin = new DuplicatePairIdsPlugin(pairRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('duplicate-pair-ids');
      expect(plugin.title).toBe('Duplicate PairIds');
    });
  });

  describe('run', () => {
    it('returns empty array when no pairs exist', async () => {
      pairRepo.getAllKeys.mockReturnValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all pairIds are unique', async () => {
      pairRepo.getAllKeys.mockReturnValue(['HDFC', 'TCS', 'INFY']);
      pairRepo.get.mockImplementation((key: string) => {
        switch (key) {
          case 'HDFC':
            return new PairInfo('HDFC Bank', '100', 'NSE', 'HDFC');
          case 'TCS':
            return new PairInfo('TCS', '200', 'NSE', 'TCS');
          case 'INFY':
            return new PairInfo('Infosys', '300', 'NSE', 'INFY');
        }
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for duplicate pairId shared by two tickers', async () => {
      pairRepo.getAllKeys.mockReturnValue(['VOLTAS', 'VOLT']);
      pairRepo.get.mockImplementation((key: string) => {
        if (key === 'VOLTAS') return new PairInfo('Voltas Ltd.', '18462', 'NSE', 'VOLTAS');
        if (key === 'VOLT') return new PairInfo('Voltas Ltd.', '18462', 'NSE', 'VOLT');
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('18462');
      expect(results[0].code).toBe('DUPLICATE_PAIR_ID');
      expect(results[0].severity).toBe('MEDIUM');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({
        pairId: '18462',
        investingTickers: ['VOLTAS', 'VOLT'],
        pairName: 'Voltas Ltd.',
      });
    });

    it('emits FAIL for pairId shared by three tickers', async () => {
      pairRepo.getAllKeys.mockReturnValue(['AEGISCHEM', 'AEGISLOG', 'AEGS']);
      pairRepo.get.mockReturnValue(new PairInfo('Aegis Logistics', '947157', 'NSE', 'AEGS'));

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].data).toEqual({
        pairId: '947157',
        investingTickers: ['AEGISCHEM', 'AEGISLOG', 'AEGS'],
        pairName: 'Aegis Logistics',
      });
      expect(results[0].message).toContain('AEGISCHEM');
      expect(results[0].message).toContain('AEGISLOG');
      expect(results[0].message).toContain('AEGS');
    });

    it('emits multiple FAILs for multiple duplicate groups', async () => {
      pairRepo.getAllKeys.mockReturnValue(['VOLTAS', 'VOLT', 'HDFC', 'HLL', 'UNIQUE']);
      pairRepo.get.mockImplementation((key: string) => {
        switch (key) {
          case 'VOLTAS':
            return new PairInfo('Voltas', '18462', 'NSE', 'VOLTAS');
          case 'VOLT':
            return new PairInfo('Voltas', '18462', 'NSE', 'VOLT');
          case 'HDFC':
            return new PairInfo('HUL', '18185', 'NSE', 'HDFC');
          case 'HLL':
            return new PairInfo('HUL', '18185', 'NSE', 'HLL');
          case 'UNIQUE':
            return new PairInfo('Unique', '99999', 'NSE', 'UNIQUE');
        }
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const pairIds = results.map((r) => r.target).sort();
      expect(pairIds).toEqual(['18185', '18462']);
    });

    it('skips entries with null pair info', async () => {
      pairRepo.getAllKeys.mockReturnValue(['VALID', 'NULL_PAIR']);
      pairRepo.get.mockImplementation((key: string) => {
        if (key === 'VALID') return new PairInfo('Valid', '100', 'NSE', 'VALID');
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['HDFC'])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      pairRepo.getAllKeys.mockReturnValue(['A', 'B']);
      pairRepo.get.mockReturnValue(new PairInfo('Test', '123', 'NSE', 'TEST'));

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toHaveProperty('pluginId');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('status');
      expect(result.pluginId).toBe('duplicate-pair-ids');
    });
  });
});
