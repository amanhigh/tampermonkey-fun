import { AuditResult, AuditSeverity } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IPairManager } from './pair';
import { IAlertManager } from './alert';
import { IWatchManager } from './watch';
import { ISymbolManager } from './symbol';
import { AlertState } from '../models/alert';
import { Constants } from '../models/constant';

/**
 * Alerts audit plugin: classifies tickers using existing managers
 * and returns findings for non-VALID states.
 *
 * Features:
 * - Filters out watched tickers (don't audit what's already being watched)
 * - Maps investing tickers to TV format for watchlist checking
 * - Classifies alerts: NO_PAIR, NO_ALERTS, SINGLE_ALERT, VALID
 * - Returns only FAIL status results (issues that need attention)
 */
export class AlertsPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ALERTS;
  public readonly title = 'Alerts Coverage';

  constructor(
    private readonly pairManager: IPairManager,
    private readonly alertManager: IAlertManager,
    private readonly watchManager: IWatchManager,
    private readonly symbolManager: ISymbolManager
  ) {
    super();
  }

  async run(targets?: string[]): Promise<AuditResult[]> {
    const investingTickers = targets && targets.length > 0 ? targets : this.pairManager.getAllInvestingTickers();
    const results: AuditResult[] = [];
    // TODO: Add Prerun Hooks,need to referesh Alerts for correct Data.
    // FIXME: Add To Watchlist should run Audit for Current Ticker.

    investingTickers.forEach((investingTicker: string) => {
      // Map investing ticker to TV format for watchlist checking
      const tvTicker = this.investingToTv(investingTicker);

      // Skip watched tickers (don't audit what's already being watched)
      if (this.watchManager.isWatched(tvTicker)) {
        return; // Skip this ticker
      }

      // Get alerts for this ticker using investing format
      const alerts = this.alertManager.getAlertsForInvestingTicker(investingTicker);
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
        // Severity mapping: invalid mapping > single alert > no alerts
        const severity: AuditSeverity =
          state === AlertState.NO_PAIR
            ? 'HIGH' // Invalid mapping is most urgent
            : state === AlertState.SINGLE_ALERT
              ? 'HIGH' // Single alert is high priority
              : 'MEDIUM'; // No alerts is medium priority

        results.push({
          pluginId: this.id,
          code: state,
          target: investingTicker, // Store investing format as target
          message: `${investingTicker}: ${state}`,
          severity,
          status,
        });
      }
    });

    return Promise.resolve(results);
  }

  /**
   * Map investing ticker to TV ticker for watchlist checking
   * @private
   */
  private investingToTv(investingTicker: string): string {
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    return tvTicker || investingTicker;
  }
}
