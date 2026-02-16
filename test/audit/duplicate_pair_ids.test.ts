import { DuplicatePairIdsPlugin } from '../../src/manager/duplicate_pair_ids_plugin';
import { IPairManager } from '../../src/manager/pair';
import { PairInfo } from '../../src/models/alert';

describe('DuplicatePairIdsPlugin', () => {
  let plugin: DuplicatePairIdsPlugin;
  let pairManager: jest.Mocked<IPairManager>;

  beforeEach(() => {
    pairManager = {
      getAllInvestingTickers: jest.fn(),
      investingTickerToPairInfo: jest.fn(),
    } as any;

    plugin = new DuplicatePairIdsPlugin(pairManager);
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
      pairManager.getAllInvestingTickers.mockReturnValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all pairIds are unique', async () => {
      pairManager.getAllInvestingTickers.mockReturnValue(['HDFC', 'TCS', 'INFY']);
      pairManager.investingTickerToPairInfo.mockImplementation((key: string) => {
        switch (key) {
          case 'HDFC':
            return new PairInfo('HDFC Bank', '100', 'NSE', 'HDFC');
          case 'TCS':
            return new PairInfo('TCS', '200', 'NSE', 'TCS');
          case 'INFY':
            return new PairInfo('Infosys', '300', 'NSE', 'INFY');
        }
        return null;
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for duplicate pairId shared by two tickers', async () => {
      pairManager.getAllInvestingTickers.mockReturnValue(['VOLTAS', 'VOLT']);
      pairManager.investingTickerToPairInfo.mockImplementation((key: string) => {
        if (key === 'VOLTAS') return new PairInfo('Voltas Ltd.', '18462', 'NSE', 'VOLTAS');
        if (key === 'VOLT') return new PairInfo('Voltas Ltd.', '18462', 'NSE', 'VOLT');
        return null;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('Voltas Ltd.');
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
      pairManager.getAllInvestingTickers.mockReturnValue(['AEGISCHEM', 'AEGISLOG', 'AEGS']);
      pairManager.investingTickerToPairInfo.mockReturnValue(new PairInfo('Aegis Logistics', '947157', 'NSE', 'AEGS'));

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
      pairManager.getAllInvestingTickers.mockReturnValue(['VOLTAS', 'VOLT', 'HDFC', 'HLL', 'UNIQUE']);
      pairManager.investingTickerToPairInfo.mockImplementation((key: string) => {
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
        return null;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['HUL', 'Voltas']);
    });

    it('skips entries with null pair info', async () => {
      pairManager.getAllInvestingTickers.mockReturnValue(['VALID', 'NULL_PAIR']);
      pairManager.investingTickerToPairInfo.mockImplementation((key: string) => {
        if (key === 'VALID') return new PairInfo('Valid', '100', 'NSE', 'VALID');
        return null;
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['HDFC'])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      pairManager.getAllInvestingTickers.mockReturnValue(['A', 'B']);
      pairManager.investingTickerToPairInfo.mockReturnValue(new PairInfo('Test', '123', 'NSE', 'TEST'));

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
