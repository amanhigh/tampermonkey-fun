import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './base';
import { IPairManager } from '../manager/pair';
import { IAlertManager } from '../manager/alert';
import { AlertState } from '../models/alert';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * Minimal Alerts audit plugin: classifies tickers using existing managers
 * and returns findings for non-VALID states.
 */
export class AlertsAudit extends BaseAuditPlugin {
  public readonly id = AUDIT_IDS.ALERTS;
  public readonly title = 'Alerts Coverage';

  constructor(
    private readonly pairManager: IPairManager,
    private readonly alertManager: IAlertManager
  ) {
    super();
  }

  async run(targets?: string[]): Promise<AuditResult[]> {
    const investingTickers = targets && targets.length > 0 ? targets : this.pairManager.getAllInvestingTickers();
    const results: AuditResult[] = [];

    investingTickers.forEach((ticker: string) => {
      const alerts = this.alertManager.getAlertsForInvestingTicker(ticker);
      let state: AlertState;
      if (alerts === null) {
        state = AlertState.NO_PAIR;
      } else if (alerts.length === 0) {
        state = AlertState.NO_ALERTS;
      } else if (alerts.length === 1) {
        state = AlertState.SINGLE_ALERT;
      } else {
        state = AlertState.VALID;
      }

      const status = state === AlertState.VALID ? 'PASS' : 'FAIL';
      if (status === 'FAIL') {
        results.push({
          pluginId: this.id,
          code: state,
          target: ticker,
          message: `${ticker}: ${state}`,
          severity: state === AlertState.SINGLE_ALERT ? 'HIGH' : 'MEDIUM',
          status,
        });
      }
    });

    return Promise.resolve(results);
  }
}
