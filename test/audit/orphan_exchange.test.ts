import { OrphanExchangePlugin } from '../../src/manager/orphan_exchange_plugin';
import { IExchangeRepo } from '../../src/repo/exchange';
import { ITickerRepo } from '../../src/repo/ticker';

describe('OrphanExchangePlugin', () => {
  let plugin: OrphanExchangePlugin;
  let exchangeRepo: jest.Mocked<IExchangeRepo>;
  let tickerRepo: jest.Mocked<ITickerRepo>;

  beforeEach(() => {
    exchangeRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
    } as any;

    tickerRepo = {
      has: jest.fn(),
    } as any;

    plugin = new OrphanExchangePlugin(exchangeRepo, tickerRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('orphan-exchange');
      expect(plugin.title).toBe('Orphan Exchange');
    });
  });

  describe('run', () => {
    it('returns empty array when no exchange mappings exist', async () => {
      exchangeRepo.getAllKeys.mockReturnValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all exchange tickers exist in TickerRepo', async () => {
      exchangeRepo.getAllKeys.mockReturnValue(['HDFC', 'TCS']);
      tickerRepo.has.mockReturnValue(true);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for orphan exchange mapping not in TickerRepo', async () => {
      exchangeRepo.getAllKeys.mockReturnValue(['ORPHAN']);
      exchangeRepo.get.mockReturnValue('NSE:ORPHAN');
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN');
      expect(results[0].code).toBe('ORPHAN_EXCHANGE');
      expect(results[0].severity).toBe('MEDIUM');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ tvTicker: 'ORPHAN', exchangeValue: 'NSE:ORPHAN' });
    });

    it('emits FAIL only for orphan exchange mappings when some are valid', async () => {
      exchangeRepo.getAllKeys.mockReturnValue(['VALID', 'ORPHAN']);
      exchangeRepo.get.mockImplementation((key: string) => {
        if (key === 'ORPHAN') return 'NSE:ORPHAN';
        return 'NSE:VALID';
      });
      tickerRepo.has.mockImplementation((key: string) => key === 'VALID');

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORPHAN');
    });

    it('handles multiple orphan exchange mappings', async () => {
      exchangeRepo.getAllKeys.mockReturnValue(['ORPHAN1', 'ORPHAN2']);
      exchangeRepo.get.mockImplementation((key: string) => `NSE:${key}`);
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['ORPHAN1', 'ORPHAN2']);
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['ORPHAN'])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      exchangeRepo.getAllKeys.mockReturnValue(['ORPHAN']);
      exchangeRepo.get.mockReturnValue('NSE:ORPHAN');
      tickerRepo.has.mockReturnValue(false);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toHaveProperty('pluginId');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('status');
      expect(result.pluginId).toBe('orphan-exchange');
      expect(result.message).toContain('ORPHAN');
      expect(result.message).toContain('TickerRepo');
    });
  });
});
