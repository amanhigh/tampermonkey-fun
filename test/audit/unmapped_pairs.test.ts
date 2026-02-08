import { UnmappedPairsPlugin } from '../../src/manager/unmapped_pairs_plugin';
import { IPairRepo } from '../../src/repo/pair';
import { ITickerRepo } from '../../src/repo/ticker';
import { PairInfo } from '../../src/models/alert';

// Unit tests for UnmappedPairsAudit: identifies pairs without TradingView mappings

describe('UnmappedPairsPlugin', () => {
  let plugin: UnmappedPairsPlugin;
  let pairRepo: jest.Mocked<IPairRepo>;
  let tickerRepo: jest.Mocked<ITickerRepo>;

  beforeEach(() => {
    pairRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
    } as any;

    tickerRepo = {
      getTvTicker: jest.fn(),
    } as any;

    plugin = new UnmappedPairsPlugin(pairRepo, tickerRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('unmapped-pairs');
      expect(plugin.title).toBe('Unmapped Pairs');
    });
  });

  describe('run', () => {
    it('returns empty array when no pairs exist', async () => {
      pairRepo.getAllKeys.mockReturnValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(pairRepo.getAllKeys).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when all pairs have TV mappings', async () => {
      const pair1 = new PairInfo('AAPL', 'pair1', 'NSE', 'AAPL-EQ');
      const pair2 = new PairInfo('MSFT', 'pair2', 'NSE', 'MSFT-EQ');

      pairRepo.getAllKeys.mockReturnValue(['AAPL', 'MSFT']);
      pairRepo.get.mockImplementation((investingTicker: string) => {
        if (investingTicker === 'AAPL') return pair1;
        if (investingTicker === 'MSFT') return pair2;
        return undefined;
      });

      tickerRepo.getTvTicker.mockReturnValue('MAPPED_TV_TICKER');

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(tickerRepo.getTvTicker).toHaveBeenCalledTimes(2);
    });

    it('emits FAIL for single pair without TV mapping', async () => {
      const pair = new PairInfo('TSLA', 'pair1', 'NSE', 'TSLA-EQ');

      pairRepo.getAllKeys.mockReturnValue(['TSLA']);
      pairRepo.get.mockReturnValue(pair);
      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].pluginId).toBe('unmapped-pairs');
      expect(results[0].code).toBe('NO_TV_MAPPING');
      expect(results[0].target).toBe('TSLA');
      expect(results[0].message).toBe('TSLA: Pair exists but has no TradingView mapping');
      expect(results[0].severity).toBe('MEDIUM');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ investingTicker: 'TSLA' });
    });

    it('emits FAIL for multiple pairs without TV mappings', async () => {
      const pair1 = new PairInfo('TSLA', 'pair1', 'NSE', 'TSLA-EQ');
      const pair2 = new PairInfo('AMZN', 'pair2', 'NSE', 'AMZN-EQ');

      pairRepo.getAllKeys.mockReturnValue(['TSLA', 'AMZN']);
      pairRepo.get.mockImplementation((investingTicker: string) => {
        if (investingTicker === 'TSLA') return pair1;
        if (investingTicker === 'AMZN') return pair2;
        return undefined;
      });

      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run();

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['AMZN', 'TSLA']);

      results.forEach((result) => {
        expect(result.pluginId).toBe('unmapped-pairs');
        expect(result.code).toBe('NO_TV_MAPPING');
        expect(result.severity).toBe('MEDIUM');
        expect(result.status).toBe('FAIL');
      });
    });

    it('emits FAIL only for unmapped pairs when some are mapped', async () => {
      const pair1 = new PairInfo('AAPL', 'pair1', 'NSE', 'AAPL-EQ');
      const pair2 = new PairInfo('TSLA', 'pair2', 'NSE', 'TSLA-EQ');
      const pair3 = new PairInfo('MSFT', 'pair3', 'NSE', 'MSFT-EQ');

      pairRepo.getAllKeys.mockReturnValue(['AAPL', 'TSLA', 'MSFT']);
      pairRepo.get.mockImplementation((investingTicker: string) => {
        switch (investingTicker) {
          case 'AAPL':
            return pair1;
          case 'TSLA':
            return pair2;
          case 'MSFT':
            return pair3;
        }
        return undefined;
      });

      tickerRepo.getTvTicker.mockImplementation((investingTicker: string) => {
        // Only AAPL and MSFT have mappings
        return investingTicker === 'AAPL' || investingTicker === 'MSFT' ? 'TV_TICKER' : null;
      });

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('TSLA');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ investingTicker: 'TSLA' });
    });

    it('throws error when targets provided', async () => {
      expect(() => plugin.run(['TSLA'])).rejects.toThrow('does not support targeted mode');
    });

    it('throws error when empty targets array provided', async () => {
      expect(() => plugin.run([])).rejects.toThrow('does not support targeted mode');
    });

    it('verifies correct AuditResult structure', async () => {
      const pair = new PairInfo('UNMAPPED', 'pair1', 'NSE', 'UNMAPPED-EQ');

      pairRepo.getAllKeys.mockReturnValue(['UNMAPPED']);
      pairRepo.get.mockReturnValue(pair);
      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toHaveProperty('pluginId');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('data');

      expect(result.pluginId).toBe('unmapped-pairs');
      expect(result.code).toBe('NO_TV_MAPPING');
      expect(result.severity).toBe('MEDIUM');
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('UNMAPPED');
      expect(result.message).toContain('TradingView mapping');
      expect(result.data).toEqual({ investingTicker: 'UNMAPPED' });
    });
  });
});
