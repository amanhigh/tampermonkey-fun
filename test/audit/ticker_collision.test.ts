import { TickerCollisionPlugin } from '../../src/manager/ticker_collision_plugin';
import { ITickerRepo } from '../../src/repo/ticker';

describe('TickerCollisionPlugin', () => {
  let plugin: TickerCollisionPlugin;
  let tickerRepo: jest.Mocked<ITickerRepo>;

  beforeEach(() => {
    tickerRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
    } as any;

    plugin = new TickerCollisionPlugin(tickerRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('ticker-collision');
      expect(plugin.title).toBe('Ticker Reverse Map Collisions');
    });
  });

  describe('run', () => {
    it('returns empty array when no tickers exist', async () => {
      tickerRepo.getAllKeys.mockReturnValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all investingTickers have single tvTicker', async () => {
      tickerRepo.getAllKeys.mockReturnValue(['HDFC', 'TCS']);
      tickerRepo.get.mockImplementation((key: string) => {
        if (key === 'HDFC') return 'HDFCBANK';
        if (key === 'TCS') return 'TCS_INV';
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('emits FAIL for investingTicker with multiple tvTicker aliases', async () => {
      tickerRepo.getAllKeys.mockReturnValue(['M_M', 'M&M', 'TCS']);
      tickerRepo.get.mockImplementation((key: string) => {
        if (key === 'M_M') return 'M&M';
        if (key === 'M&M') return 'M&M';
        if (key === 'TCS') return 'TCS_INV';
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('M&M');
      expect(results[0].code).toBe('TICKER_COLLISION');
      expect(results[0].severity).toBe('MEDIUM');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({
        investingTicker: 'M&M',
        tvTickers: ['M_M', 'M&M'],
      });
    });

    it('handles multiple collision groups', async () => {
      tickerRepo.getAllKeys.mockReturnValue(['M_M', 'M&M', 'PTC', 'PFS']);
      tickerRepo.get.mockImplementation((key: string) => {
        if (key === 'M_M' || key === 'M&M') return 'M&M';
        if (key === 'PTC' || key === 'PFS') return 'PTC';
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['M&M', 'PTC']);
    });

    it('skips tickers with null investingTicker value', async () => {
      tickerRepo.getAllKeys.mockReturnValue(['VALID', 'NULL_TICKER']);
      tickerRepo.get.mockImplementation((key: string) => {
        if (key === 'VALID') return 'VALID_INV';
        return undefined;
      });

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['TCS'])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      tickerRepo.getAllKeys.mockReturnValue(['A', 'B']);
      tickerRepo.get.mockReturnValue('SAME');

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toHaveProperty('pluginId');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('status');
      expect(result.pluginId).toBe('ticker-collision');
      expect(result.message).toContain('SAME');
    });
  });
});
