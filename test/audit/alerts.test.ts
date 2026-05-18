import { AlertsPlugin } from '../../src/manager/alerts_plugin';
import { IAlertManager } from '../../src/manager/alert';
import { ITickerManager } from '../../src/manager/ticker';
import { IWatchManager } from '../../src/manager/watch';
import { AlertState } from '../../src/models/alert';
import { Ticker } from '../../src/models/ticker';

describe('AlertsPlugin', () => {
  let plugin: AlertsPlugin;
  let tickerManager: jest.Mocked<ITickerManager>;
  let alertManager: jest.Mocked<IAlertManager>;
  let watchManager: jest.Mocked<IWatchManager>;

  beforeEach(() => {
    tickerManager = {
      listTickers: jest.fn().mockResolvedValue([]),
    } as any;

    alertManager = {
      getAlertsForTicker: jest.fn(),
    } as any;

    watchManager = {
      isWatched: jest.fn().mockReturnValue(false),
    } as any;

    plugin = new AlertsPlugin(tickerManager, alertManager, watchManager);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
    });
  });

  describe('run', () => {
    it('audits tracked TV tickers and emits only weak alert coverage results', async () => {
      tickerManager.listTickers.mockResolvedValue([
        new Ticker({ ticker: 'NO_ALERTS_TICKER' }),
        new Ticker({ ticker: 'SINGLE_ALERT_TICKER' }),
        new Ticker({ ticker: 'VALID_TICKER' }),
      ]);

      alertManager.getAlertsForTicker.mockImplementation((ticker: string) => {
        if (ticker === 'NO_ALERTS_TICKER') return Promise.resolve([] as any);
        if (ticker === 'SINGLE_ALERT_TICKER') return Promise.resolve([{ id: 'x', price: 1, pairId: 'p' }] as any);
        return Promise.resolve([
          { id: 'x', price: 1, pairId: 'p' },
          { id: 'y', price: 2, pairId: 'p' },
        ] as any);
      });

      const results = await plugin.run();

      expect(tickerManager.listTickers).toHaveBeenCalledWith({ 'sort-by': 'ticker', 'sort-order': 'asc' });
      expect(alertManager.getAlertsForTicker).toHaveBeenCalledWith('NO_ALERTS_TICKER');
      expect(alertManager.getAlertsForTicker).toHaveBeenCalledWith('SINGLE_ALERT_TICKER');
      expect(alertManager.getAlertsForTicker).toHaveBeenCalledWith('VALID_TICKER');
      expect(results.map((r) => r.target).sort()).toEqual(['NO_ALERTS_TICKER', 'SINGLE_ALERT_TICKER']);

      const byTarget = Object.fromEntries(results.map((r) => [r.target, r]));
      expect(byTarget['NO_ALERTS_TICKER'].code).toBe(AlertState.NO_ALERTS);
      expect(byTarget['NO_ALERTS_TICKER'].severity).toBe('MEDIUM');
      expect(byTarget['SINGLE_ALERT_TICKER'].code).toBe(AlertState.SINGLE_ALERT);
      expect(byTarget['SINGLE_ALERT_TICKER'].severity).toBe('HIGH');
    });

    it('uses provided TV targets without listing all tracked tickers', async () => {
      alertManager.getAlertsForTicker.mockResolvedValue([]);

      const results = await plugin.run(['TARGET_TICKER']);

      expect(tickerManager.listTickers).not.toHaveBeenCalled();
      expect(alertManager.getAlertsForTicker).toHaveBeenCalledWith('TARGET_TICKER');
      expect(results).toHaveLength(1);
      expect(results[0].target).toBe('TARGET_TICKER');
    });

    it('excludes watched TV tickers from alert coverage results', async () => {
      tickerManager.listTickers.mockResolvedValue([
        new Ticker({ ticker: 'WATCHED_TICKER' }),
        new Ticker({ ticker: 'UNWATCHED_TICKER' }),
      ]);
      watchManager.isWatched.mockImplementation((ticker: string) => ticker === 'WATCHED_TICKER');
      alertManager.getAlertsForTicker.mockResolvedValue([]);

      const results = await plugin.run();

      expect(alertManager.getAlertsForTicker).not.toHaveBeenCalledWith('WATCHED_TICKER');
      expect(alertManager.getAlertsForTicker).toHaveBeenCalledWith('UNWATCHED_TICKER');
      expect(results.map((r) => r.target)).toEqual(['UNWATCHED_TICKER']);
    });
  });
});
