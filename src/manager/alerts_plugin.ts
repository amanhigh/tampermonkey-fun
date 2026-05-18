import { AuditResult, AuditSeverity } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IAlertTickerClient } from '../client/alert_ticker';
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
    private readonly alertTickerClient: IAlertTickerClient,
    private readonly alertManager: IAlertManager,
    private readonly watchManager: IWatchManager,
    private readonly symbolManager: ISymbolManager
  ) {
    super();
  }

  async run(targets?: string[]): Promise<AuditResult[]> {
    const allAlertTickers = await this.alertTickerClient.listAlertTickers({});
    const allTickers = allAlertTickers.map((at) => at.symbol);
    const investingTickers = targets && targets.length > 0 ? targets : allTickers;
    const results: AuditResult[] = [];
    // FIXME: Add To Watchlist should run Audit for Current Ticker.

    for (const investingTicker of investingTickers) {
      const tvTicker = this.investingToTv(investingTicker);

      // Skip watched tickers (don't audit what's already being watched)
      if (this.watchManager.isWatched(tvTicker)) {
        continue;
      }

      const alerts = await this.alertManager.getAlertsForInvestingTicker(investingTicker);
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
          state === AlertState.NO_PAIR ? 'HIGH' : state === AlertState.SINGLE_ALERT ? 'HIGH' : 'MEDIUM';

        results.push({
          pluginId: this.id,
          code: state,
          target: investingTicker,
          message: `${investingTicker}: ${state}`,
          severity,
          status,
        });
      }
    }

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
