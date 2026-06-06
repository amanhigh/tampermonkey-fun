import { AuditResult, AuditSeverity } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IAlertManager } from './alert';
import { ITickerManager } from './ticker';
import { IWatchManager } from './watch';
import { AlertState } from '../models/alert';
import { Constants } from '../models/constant';

/**
 * Alerts audit plugin: classifies tracked TradingView tickers by backend price-alert coverage.
 *
 * Features:
 * - Uses primary TV tickers as the audit universe after MySQL migration
 * - Filters out watched tickers because they are already actively monitored
 * - Classifies alerts: NO_ALERTS, SINGLE_ALERT, VALID
 * - Returns only FAIL status results (issues that need attention)
 */
export class AlertsPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.ALERTS;
  public readonly title = 'Alerts Coverage';

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly alertManager: IAlertManager,
    private readonly watchManager: IWatchManager
  ) {
    super();
  }

  async run(targets?: string[]): Promise<AuditResult[]> {
    const tvTickers = targets && targets.length > 0 ? targets : await this.listTrackedTvTickers();
    const results: AuditResult[] = [];

    for (const tvTicker of tvTickers) {
      if (this.watchManager.isWatched(tvTicker)) {
        continue;
      }

      const alerts = await this.alertManager.getAlertsForTicker(tvTicker);
      let state: AlertState;
      if (alerts.length === 0) {
        state = AlertState.NO_ALERTS;
      } else if (alerts.length === 1) {
        state = AlertState.SINGLE_ALERT;
      } else {
        state = AlertState.VALID;
      }

      const status = state === AlertState.VALID ? 'PASS' : 'FAIL';
      if (status === 'FAIL') {
        // Severity mapping: single alert is high risk, no alerts is medium risk.
        const severity: AuditSeverity = state === AlertState.SINGLE_ALERT ? 'HIGH' : 'MEDIUM';

        results.push({
          pluginId: this.id,
          code: state,
          target: tvTicker,
          message: `${tvTicker}: ${state}`,
          severity,
          status,
        });
      }
    }

    return Promise.resolve(results);
  }

  private async listTrackedTvTickers(): Promise<string[]> {
    const tickers = await this.tickerManager.listTickers({ 'sort-by': 'ticker', 'sort-order': 'asc' });
    return tickers.map((ticker) => ticker.ticker);
  }
}
