import { AlertsAudit } from '../../src/audit/alerts';
import { IPairManager } from '../../src/manager/pair';
import { IAlertManager } from '../../src/manager/alert';
import { AlertState } from '../../src/models/alert';

// Minimal unit tests for AlertsAudit: PASS/FAIL mapping and severity

describe('AlertsAudit', () => {
  let plugin: AlertsAudit;
  let pairManager: jest.Mocked<IPairManager>;
  let alertManager: jest.Mocked<IAlertManager>;

  beforeEach(() => {
    pairManager = {
      getAllInvestingTickers: jest.fn(),
    } as any;

    alertManager = {
      getAlertsForInvestingTicker: jest.fn(),
    } as any;

    plugin = new AlertsAudit(pairManager, alertManager);
  });

  describe('validate', () => {
    it('enforces non-empty id/title', () => {
      expect(() => plugin.validate()).not.toThrow();
    });
  });

  describe('run', () => {
    describe('classification', () => {
      let results: ReturnType<AlertsAudit['run']>;

      beforeEach(() => {
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

        results = plugin.run();
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
      let results: ReturnType<AlertsAudit['run']>;

      beforeEach(() => {
        pairManager.getAllInvestingTickers.mockReturnValue(['SINGLE_ALERT_TICKER', 'NO_ALERTS_TICKER']);
        alertManager.getAlertsForInvestingTicker.mockImplementation((ticker: string) => {
          if (ticker === 'SINGLE_ALERT_TICKER') return [{ id: 'x', price: 1, pairId: 'p' }] as any; // SINGLE_ALERT
          if (ticker === 'NO_ALERTS_TICKER') return [] as any; // NO_ALERTS
          return [] as any;
        });
        results = plugin.run();
      });

      it('marks SINGLE_ALERT as HIGH and NO_ALERTS as MEDIUM', () => {
        const byTarget = Object.fromEntries(results.map((r) => [r.target, r]));
        expect(byTarget['SINGLE_ALERT_TICKER'].severity).toBe('HIGH');
        expect(byTarget['NO_ALERTS_TICKER'].severity).toBe('MEDIUM');
      });
    });
  });
});
