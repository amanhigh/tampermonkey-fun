import { UnmappedPairsAudit } from '../../src/audit/unmapped_pairs';
import { IPairRepo } from '../../src/repo/pair';
import { ITickerRepo } from '../../src/repo/ticker';
import { PairInfo } from '../../src/models/alert';

// Unit tests for UnmappedPairsAudit: identifies pairs without TradingView mappings

describe('UnmappedPairsAudit', () => {
  let plugin: UnmappedPairsAudit;
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

    plugin = new UnmappedPairsAudit(pairRepo, tickerRepo);
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
      expect(results[0]).toEqual({
        pluginId: 'unmapped-pairs',
        code: 'NO_TV_MAPPING',
        target: 'TSLA',
        message: 'TSLA: Pair exists but has no TradingView mapping',
        severity: 'HIGH',
        status: 'FAIL',
      });
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
        expect(result.severity).toBe('HIGH');
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
    });

    it('supports targeted run for single ticker', async () => {
      const pair = new PairInfo('TSLA', 'pair1', 'NSE', 'TSLA-EQ');

      pairRepo.get.mockReturnValue(pair);
      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run(['TSLA']);

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('TSLA');
      // getAllKeys should NOT be called in targeted mode
      expect(pairRepo.getAllKeys).not.toHaveBeenCalled();
    });

    it('supports targeted run for multiple tickers', async () => {
      const pair1 = new PairInfo('TSLA', 'pair1', 'NSE', 'TSLA-EQ');
      const pair2 = new PairInfo('AMZN', 'pair2', 'NSE', 'AMZN-EQ');

      pairRepo.get.mockImplementation((investingTicker: string) => {
        if (investingTicker === 'TSLA') return pair1;
        if (investingTicker === 'AMZN') return pair2;
        return undefined;
      });

      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run(['TSLA', 'AMZN']);

      expect(results).toHaveLength(2);
      const targets = results.map((r) => r.target).sort();
      expect(targets).toEqual(['AMZN', 'TSLA']);
    });

    it('handles empty targets array as batch mode (all pairs)', async () => {
      const pair = new PairInfo('TSLA', 'pair1', 'NSE', 'TSLA-EQ');

      pairRepo.getAllKeys.mockReturnValue(['TSLA']);
      pairRepo.get.mockReturnValue(pair);
      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run([]);

      expect(results).toHaveLength(1);
      // Empty array should trigger getAllKeys
      expect(pairRepo.getAllKeys).toHaveBeenCalled();
    });

    it('skips pair if pairInfo is null (defensive)', async () => {
      pairRepo.getAllKeys.mockReturnValue(['NONEXISTENT']);
      pairRepo.get.mockReturnValue(undefined);

      const results = await plugin.run();

      expect(results).toEqual([]);
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

      expect(result.pluginId).toBe('unmapped-pairs');
      expect(result.code).toBe('NO_TV_MAPPING');
      expect(result.severity).toBe('HIGH');
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('UNMAPPED');
      expect(result.message).toContain('TradingView mapping');
    });
  });
});
