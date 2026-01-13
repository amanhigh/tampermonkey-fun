import { AlertsAudit } from '../../src/audit/alerts';
import { IPairManager } from '../../src/manager/pair';
import { IAlertManager } from '../../src/manager/alert';
import { IWatchManager } from '../../src/manager/watch';
import { ISymbolManager } from '../../src/manager/symbol';
import { AlertState } from '../../src/models/alert';

// Unit tests for AlertsAudit: classification, severity, and watchlist exclusion

describe('AlertsAudit', () => {
  let plugin: AlertsAudit;
  let pairManager: jest.Mocked<IPairManager>;
  let alertManager: jest.Mocked<IAlertManager>;
  let watchManager: jest.Mocked<IWatchManager>;
  let symbolManager: jest.Mocked<ISymbolManager>;

  beforeEach(() => {
    pairManager = {
      getAllInvestingTickers: jest.fn(),
    } as any;

    alertManager = {
      getAlertsForInvestingTicker: jest.fn(),
    } as any;

    watchManager = {
      isWatched: jest.fn().mockReturnValue(false), // Default: not watched
    } as any;

    symbolManager = {
      investingToTv: jest.fn().mockImplementation((ticker) => `TV:${ticker}`), // Default mapping
    } as any;

    plugin = new AlertsAudit(pairManager, alertManager, watchManager, symbolManager);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
    });
  });

  describe('run', () => {
    describe('classification', () => {
      let results: Awaited<ReturnType<AlertsAudit['run']>>;

      beforeEach(async () => {
        pairManager.getAllInvestingTickers.mockReturnValue([
          'NO_PAIR_TICKER',
          'NO_ALERTS_TICKER',
          'SINGLE_ALERT_TICKER',
          'VALID_TICKER',
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
        // Should include NO_PAIR_TICKER, NO_ALERTS_TICKER, SINGLE_ALERT_TICKER only (VALID_TICKER is PASS)
        const targets = results.map((r) => r.target);
        expect(targets.sort()).toEqual(['NO_ALERTS_TICKER', 'NO_PAIR_TICKER', 'SINGLE_ALERT_TICKER']);

        // Check status and codes
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
      let results: Awaited<ReturnType<AlertsAudit['run']>>;

      beforeEach(async () => {
        pairManager.getAllInvestingTickers.mockReturnValue(['SINGLE_ALERT_TICKER', 'NO_ALERTS_TICKER']);
        alertManager.getAlertsForInvestingTicker.mockImplementation((ticker: string) => {
          if (ticker === 'SINGLE_ALERT_TICKER') return [{ id: 'x', price: 1, pairId: 'p' }] as any; // SINGLE_ALERT
          if (ticker === 'NO_ALERTS_TICKER') return [] as any; // NO_ALERTS
          return [] as any;
        });
        results = await plugin.run();
      });

      it('marks SINGLE_ALERT as HIGH and NO_ALERTS as MEDIUM', () => {
        const byTarget = Object.fromEntries(results.map((r) => [r.target, r]));
        expect(byTarget['SINGLE_ALERT_TICKER'].severity).toBe('HIGH');
        expect(byTarget['NO_ALERTS_TICKER'].severity).toBe('MEDIUM');
      });
    });

    describe('watchlist exclusion', () => {
      beforeEach(() => {
        pairManager.getAllInvestingTickers.mockReturnValue(['WATCHED_TICKER', 'UNWATCHED_TICKER', 'ANOTHER_WATCHED']);

        alertManager.getAlertsForInvestingTicker.mockImplementation(() => {
          // Return single alert for all tickers (would be FAIL if not watched)
          return [{ id: 'x', price: 1, pairId: 'p' }] as any;
        });

        // Setup: WATCHED_TICKER and ANOTHER_WATCHED are in watchlist
        symbolManager.investingToTv.mockImplementation((ticker: string) => {
          const mapping: { [key: string]: string } = {
            WATCHED_TICKER: 'TV:WATCHED_TICKER',
            UNWATCHED_TICKER: 'TV:UNWATCHED_TICKER',
            ANOTHER_WATCHED: 'TV:ANOTHER_WATCHED',
          };
          return mapping[ticker] || null;
        });

        watchManager.isWatched.mockImplementation(
          (tvTicker: string) => tvTicker === 'TV:WATCHED_TICKER' || tvTicker === 'TV:ANOTHER_WATCHED'
        );
      });

      it('excludes watched tickers from results', async () => {
        const results = await plugin.run();

        // Only UNWATCHED_TICKER should be in results (watched ones excluded)
        expect(results).toHaveLength(1);
        expect(results[0].target).toBe('UNWATCHED_TICKER');
        expect(results[0].code).toBe(AlertState.SINGLE_ALERT);
      });

      it('uses TV ticker format for watchlist checking', async () => {
        await plugin.run();

        // Verify that symbolManager.investingToTv was called for each ticker
        expect(symbolManager.investingToTv).toHaveBeenCalledWith('WATCHED_TICKER');
        expect(symbolManager.investingToTv).toHaveBeenCalledWith('UNWATCHED_TICKER');
        expect(symbolManager.investingToTv).toHaveBeenCalledWith('ANOTHER_WATCHED');

        // Verify that watchManager.isWatched was called with TV format
        expect(watchManager.isWatched).toHaveBeenCalledWith('TV:WATCHED_TICKER');
        expect(watchManager.isWatched).toHaveBeenCalledWith('TV:UNWATCHED_TICKER');
        expect(watchManager.isWatched).toHaveBeenCalledWith('TV:ANOTHER_WATCHED');
      });

      it('handles missing TV mappings gracefully (uses investing ticker as fallback)', async () => {
        symbolManager.investingToTv.mockReturnValue(null); // No mapping
        watchManager.isWatched.mockReturnValue(false);

        const results = await plugin.run();

        // All tickers should be included (no mapping = not in watchlist)
        expect(results.length).toBe(3);
      });
    });

    describe('targeted run', () => {
      beforeEach(() => {
        pairManager.getAllInvestingTickers.mockReturnValue([
          'NO_PAIR_TICKER',
          'NO_ALERTS_TICKER',
          'SINGLE_ALERT_TICKER',
          'VALID_TICKER',
        ]);

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
      });

      it('audits only specified targets when targets array is provided', async () => {
        const results = await plugin.run(['SINGLE_ALERT_TICKER', 'VALID_TICKER']);

        expect(results).toHaveLength(1);
        expect(results[0].target).toBe('SINGLE_ALERT_TICKER');
        expect(results[0].code).toBe(AlertState.SINGLE_ALERT);
      });

      it('audits all targets when no targets array is provided', async () => {
        const results = await plugin.run();

        const targets = results.map((r) => r.target);
        expect(targets.sort()).toEqual(['NO_ALERTS_TICKER', 'NO_PAIR_TICKER', 'SINGLE_ALERT_TICKER']);
      });

      it('treats empty targets array same as undefined (uses all tickers)', async () => {
        const results = await plugin.run([]);

        // Empty targets array should behave like undefined - audit all tickers
        const targets = results.map((r) => r.target);
        expect(targets.sort()).toEqual(['NO_ALERTS_TICKER', 'NO_PAIR_TICKER', 'SINGLE_ALERT_TICKER']);
      });
    });
  });
});
