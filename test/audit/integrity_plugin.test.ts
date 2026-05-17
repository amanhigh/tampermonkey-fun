import { IntegrityPlugin } from '../../src/manager/integrity_plugin';
import { IAlertTickerClient } from '../../src/client/alert_ticker';
import { ITickerRepo } from '../../src/repo/ticker';
import { AlertTicker } from '../../src/models/alert_ticker';

describe('IntegrityPlugin', () => {
  let plugin: IntegrityPlugin;
  let alertTickerClient: jest.Mocked<IAlertTickerClient>;
  let tickerRepo: jest.Mocked<ITickerRepo>;

  beforeEach(() => {
    alertTickerClient = {
      listAlertTickers: jest.fn(),
      getAlertTicker: jest.fn(),
      createAlertTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
    } as any;

    tickerRepo = {
      getTvTicker: jest.fn(),
    } as any;

    plugin = new IntegrityPlugin(alertTickerClient, tickerRepo);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
      expect(plugin.id).toBe('integrity');
      expect(plugin.title).toBe('Integrity');
    });
  });

  describe('run', () => {
    it('returns empty array when no alert tickers exist', async () => {
      alertTickerClient.listAlertTickers.mockResolvedValue([]);

      const results = await plugin.run();

      expect(results).toEqual([]);
    });

    it('returns empty array when all alert tickers have TV mappings', async () => {
      alertTickerClient.listAlertTickers.mockResolvedValue([
        { symbol: 'AAPL', pair_id: 'pair1', name: 'AAPL', exchange: 'NSE' } as AlertTicker,
        { symbol: 'MSFT', pair_id: 'pair2', name: 'MSFT', exchange: 'NSE' } as AlertTicker,
      ]);
      tickerRepo.getTvTicker.mockReturnValue('MAPPED_TV');

      const results = await plugin.run();

      expect(results).toEqual([]);
      expect(tickerRepo.getTvTicker).toHaveBeenCalledTimes(2);
    });

    it('emits FAIL for alert ticker without TV mapping', async () => {
      alertTickerClient.listAlertTickers.mockResolvedValue([
        { symbol: 'TSLA', pair_id: 'pair1', name: 'TSLA', exchange: 'NSE' } as AlertTicker,
      ]);
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

    it('emits FAIL only for unmapped tickers when some are mapped', async () => {
      alertTickerClient.listAlertTickers.mockResolvedValue([
        { symbol: 'AAPL', pair_id: 'p1', name: 'AAPL', exchange: 'NSE' } as AlertTicker,
        { symbol: 'TSLA', pair_id: 'p2', name: 'TSLA', exchange: 'NSE' } as AlertTicker,
        { symbol: 'MSFT', pair_id: 'p3', name: 'MSFT', exchange: 'NSE' } as AlertTicker,
      ]);
      tickerRepo.getTvTicker.mockImplementation((t: string) => (t === 'TSLA' ? null : 'TV'));

      const results = await plugin.run();

      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('TSLA');
    });

    it('throws error when targets provided', async () => {
      await expect(plugin.run(['TSLA'])).rejects.toThrow('does not support targeted mode');
    });

    it('deduplicates by pairId — only first alias checked', async () => {
      alertTickerClient.listAlertTickers.mockResolvedValue([
        { symbol: 'ORCL', pair_id: '274', name: 'Oracle', exchange: 'NYSE' } as AlertTicker,
        { symbol: 'ORCL_ALIAS', pair_id: '274', name: 'Oracle', exchange: 'NYSE' } as AlertTicker,
      ]);
      tickerRepo.getTvTicker.mockReturnValue(null);

      const results = await plugin.run();

      // Same pairId 274 — only one result emitted
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('ORCL');
    });
  });
});
