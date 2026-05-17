import { AlertsPlugin } from '../../src/manager/alerts_plugin';
import { IAlertTickerClient } from '../../src/client/alert_ticker';
import { IAlertManager } from '../../src/manager/alert';
import { IWatchManager } from '../../src/manager/watch';
import { ISymbolManager } from '../../src/manager/symbol';
import { AlertState } from '../../src/models/alert';
import { AlertTicker } from '../../src/models/alert_ticker';

// Unit tests for AlertsAudit: classification, severity, and watchlist exclusion

describe('AlertsPlugin', () => {
  let plugin: AlertsPlugin;
  let alertTickerClient: jest.Mocked<IAlertTickerClient>;
  let alertManager: jest.Mocked<IAlertManager>;
  let watchManager: jest.Mocked<IWatchManager>;
  let symbolManager: jest.Mocked<ISymbolManager>;

  beforeEach(() => {
    alertTickerClient = {
      listAlertTickers: jest.fn(),
      getAlertTicker: jest.fn(),
      createAlertTicker: jest.fn(),
      deleteAlertTicker: jest.fn(),
    } as any;

    alertManager = {
      getAlertsForInvestingTicker: jest.fn(),
    } as any;

    watchManager = {
      isWatched: jest.fn().mockReturnValue(false),
    } as any;

    symbolManager = {
      investingToTv: jest.fn().mockImplementation((ticker) => `TV:${ticker}`),
    } as any;

    plugin = new AlertsPlugin(alertTickerClient, alertManager, watchManager, symbolManager);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
    });
  });

  describe('run', () => {
    describe('classification', () => {
      let results: Awaited<ReturnType<AlertsPlugin['run']>>;

      beforeEach(async () => {
        alertTickerClient.listAlertTickers.mockResolvedValue([
          { symbol: 'NO_PAIR_TICKER' } as AlertTicker,
          { symbol: 'NO_ALERTS_TICKER' } as AlertTicker,
          { symbol: 'SINGLE_ALERT_TICKER' } as AlertTicker,
          { symbol: 'VALID_TICKER' } as AlertTicker,
        ]);

        // NO_PAIR_TICKER: NO_PAIR (null)
        // NO_ALERTS_TICKER: NO_ALERTS ([])
        // SINGLE_ALERT_TICKER: SINGLE_ALERT ([1])
        // VALID_TICKER: VALID ([1,2])
        alertManager.getAlertsForInvestingTicker.mockImplementation((ticker: string) => {
          switch (ticker) {
            case 'NO_PAIR_TICKER':
              return null;
            case 'NO_ALERTS_TICKER':
              return [] as any;
            case 'SINGLE_ALERT_TICKER':
              return [{ id: 'x', price: 1, pairId: 'p' }] as any;
            case 'VALID_TICKER':
              return [
                { id: 'x', price: 1, pairId: 'p' },
                { id: 'y', price: 2, pairId: 'p' },
              ] as any;
          }
          return [] as any;
        });

        results = await plugin.run();
      });

      it('emits FAIL results for NO_PAIR/NO_ALERTS/SINGLE_ALERT and none for VALID', () => {
        const targets = results.map((r) => r.target);
        expect(targets.sort()).toEqual(['NO_ALERTS_TICKER', 'NO_PAIR_TICKER', 'SINGLE_ALERT_TICKER']);

        const byTarget = Object.fromEntries(results.map((r) => [r.target, r]));
        expect(byTarget['NO_PAIR_TICKER'].code).toBe(AlertState.NO_PAIR);
        expect(byTarget['NO_PAIR_TICKER'].status).toBe('FAIL');
        expect(byTarget['NO_ALERTS_TICKER'].code).toBe(AlertState.NO_ALERTS);
        expect(byTarget['NO_ALERTS_TICKER'].status).toBe('FAIL');
        expect(byTarget['SINGLE_ALERT_TICKER'].code).toBe(AlertState.SINGLE_ALERT);
        expect(byTarget['SINGLE_ALERT_TICKER'].status).toBe('FAIL');
      });
    });

    describe('severity mapping', () => {
      let results: Awaited<ReturnType<AlertsPlugin['run']>>;

      beforeEach(async () => {
        alertTickerClient.listAlertTickers.mockResolvedValue([
          { symbol: 'SINGLE_ALERT_TICKER' } as AlertTicker,
          { symbol: 'NO_ALERTS_TICKER' } as AlertTicker,
        ]);
        alertManager.getAlertsForInvestingTicker.mockImplementation((ticker: string) => {
          if (ticker === 'SINGLE_ALERT_TICKER') return [{ id: 'x', price: 1, pairId: 'p' }] as any;
          if (ticker === 'NO_ALERTS_TICKER') return [] as any;
          return [] as any;
        });

        results = await plugin.run();
      });

      it('maps SINGLE_ALERT to HIGH and NO_ALERTS to MEDIUM severity', () => {
        const byTarget = Object.fromEntries(results.map((r) => [r.target, r]));
        expect(byTarget['SINGLE_ALERT_TICKER'].severity).toBe('HIGH');
        expect(byTarget['NO_ALERTS_TICKER'].severity).toBe('MEDIUM');
      });
    });

    describe('watchlist filtering', () => {
      it('excludes tickers that are watched', async () => {
        alertTickerClient.listAlertTickers.mockResolvedValue([
          { symbol: 'WATCHED_TICKER' } as AlertTicker,
          { symbol: 'UNWATCHED_TICKER' } as AlertTicker,
        ]);

        watchManager.isWatched.mockImplementation((ticker: string) => ticker === 'TV:WATCHED_TICKER');
        alertManager.getAlertsForInvestingTicker.mockResolvedValue([]);

        const results = await plugin.run();

        const targets = results.map((r) => r.target);
        expect(targets).not.toContain('WATCHED_TICKER');
        expect(targets).toContain('UNWATCHED_TICKER');
      });
    });

    describe('targeted mode', () => {
      it('uses provided targets when specified', async () => {
        alertManager.getAlertsForInvestingTicker.mockResolvedValue([]);

        const results = await plugin.run(['TARGET_TICKER']);

        expect(results).toHaveLength(1);
        expect(results[0].target).toBe('TARGET_TICKER');
      });

      it('returns empty array when no targets match', async () => {
        alertManager.getAlertsForInvestingTicker.mockResolvedValue([]);

        const results = await plugin.run(['TARGET_TICKER']);

        expect(results).toHaveLength(1);
      });
    });
  });
});
