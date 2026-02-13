import { IntegrityPlugin } from '../../src/manager/integrity_plugin';
import { IPairRepo } from '../../src/repo/pair';
import { ITickerRepo } from '../../src/repo/ticker';
import { PairInfo } from '../../src/models/alert';

describe('IntegrityPlugin', () => {
  let plugin: IntegrityPlugin;
  let pairRepo: jest.Mocked<IPairRepo>;
  let tickerRepo: jest.Mocked<ITickerRepo>;

  beforeEach(() => {
    pairRepo = {
      getAllKeys: jest.fn(),
      get: jest.fn(),
      getPairInfo: jest.fn(),
    } as any;

    tickerRepo = {
      getTvTicker: jest.fn(),
    } as any;

    plugin = new IntegrityPlugin(pairRepo, tickerRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('integrity');
      expect(plugin.title).toBe('Integrity');
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
      const pair1 = new PairInfo('AAPL', 'pair1', 'NSE', 'AAPL');
      const pair2 = new PairInfo('MSFT', 'pair2', 'NSE', 'MSFT');

      pairRepo.getAllKeys.mockReturnValue(['AAPL', 'MSFT']);
      pairRepo.getPairInfo.mockImplementation((t: string) => (t === 'AAPL' ? pair1 : pair2));
      tickerRepo.getTvTicker.mockReturnValue('MAPPED_TV');

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(tickerRepo.getTvTicker).toHaveBeenCalledTimes(2);
    });

    it('emits FAIL for pair without TV mapping', async () => {
      const pair = new PairInfo('TSLA', 'pair1', 'NSE', 'TSLA');

      pairRepo.getAllKeys.mockReturnValue(['TSLA']);
      pairRepo.getPairInfo.mockReturnValue(pair);
      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].pluginId).toBe('integrity');
      expect(results[0].code).toBe('NO_TV_MAPPING');
      expect(results[0].target).toBe('TSLA');
      expect(results[0].message).toContain('TradingView mapping');
      expect(results[0].severity).toBe('HIGH');
      expect(results[0].status).toBe('FAIL');
      expect(results[0].data).toEqual({ investingTicker: 'TSLA', pairId: 'pair1' });
    });

    it('emits FAIL only for unmapped pairs when some are mapped', async () => {
      const pair1 = new PairInfo('AAPL', 'p1', 'NSE', 'AAPL');
      const pair2 = new PairInfo('TSLA', 'p2', 'NSE', 'TSLA');
      const pair3 = new PairInfo('MSFT', 'p3', 'NSE', 'MSFT');

      pairRepo.getAllKeys.mockReturnValue(['AAPL', 'TSLA', 'MSFT']);
      pairRepo.getPairInfo.mockImplementation((t: string) => {
        if (t === 'AAPL') return pair1;
        if (t === 'TSLA') return pair2;
        return pair3;
      });
      tickerRepo.getTvTicker.mockImplementation((t: string) => (t === 'TSLA' ? null : 'TV'));

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('TSLA');
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['TSLA'])).rejects.toThrow('does not support targeted mode');
    });

    it('skips pairs with null pairInfo', async () => {
      pairRepo.getAllKeys.mockReturnValue(['GHOST']);
      pairRepo.getPairInfo.mockReturnValue(null);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('deduplicates by pairId — only first alias checked', async () => {
      const pair = new PairInfo('Oracle', '274', 'NYSE', 'ORCL');

      pairRepo.getAllKeys.mockReturnValue(['ORCL', 'ORCL_ALIAS']);
      pairRepo.getPairInfo.mockReturnValue(pair);
      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run();

      // Same pairId 274 — only one result emitted
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORCL');
    });
  });
});
