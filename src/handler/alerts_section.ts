import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/** Backend alert coverage finding codes. */
const CODE_NO_ALERT_TICKER = 'NO_ALERT_TICKER';
const CODE_NO_ALERTS = 'NO_ALERTS';
const CODE_SINGLE_ALERT = 'SINGLE_ALERT';

/**
 * Alerts Audit Section
 * Displays tracked TV tickers with weak alert coverage from the backend alert-coverage plugin.
 *
 * Backend finding codes:
 * - NO_ALERT_TICKER: Tracked ticker has no Investing.com alert ticker mapping.
 * - NO_ALERTS: Mapped ticker has no price alerts.
 * - SINGLE_ALERT: Mapped ticker has only one price alert.
 *
 * Features:
 * - Left-click: Open ticker in TradingView
 * - Right-click: Stop tracking ticker
 *
 * Pattern:
 * - Receives plugin via direct injection (not via registry)
 * - Plugin is a backend adapter that calls the Kohan audit API
 * - Section defines the UI specification and interaction handlers
 */
export class AlertsAuditSection extends BaseAuditSection implements IAuditSection {
  // Identity - matches backend alert-coverage plugin ID
  readonly id = Constants.AUDIT.PLUGINS.ALERT_COVERAGE;
  readonly title = 'Alerts Coverage';
  readonly description = 'Backend audit of tracked ticker alert coverage: NO_ALERT_TICKER / NO_ALERTS / SINGLE_ALERT';
  readonly order = 0;

  // Action labels
  readonly leftActionLabel = 'Open';
  readonly rightActionLabel = 'Stop';

  // Data source (injected directly, not fetched from registry)
  readonly plugin: IAudit;

  // Presentation
  readonly limit = 10;
  readonly context: unknown = undefined;

  // Interaction handlers
  readonly onLeftClick = (result: AuditResult) => {
    void this.tickerHandler.openTicker(result.target);
  };

  readonly onRightClick = async (result: AuditResult): Promise<void> => {
    await this.tickerHandler.stopTracking(result.target);
  };

  readonly onFixAll = async (results: AuditResult[]): Promise<void> => {
    let count = 0;
    for (const result of results) {
      await this.tickerHandler.stopTracking(result.target);
      count++;
    }
    Notifier.success(`⏹ Stopped tracking ${count} ticker(s)`);
  };

  readonly headerFormatter = (auditResults: AuditResult[]) => {
    if (auditResults.length === 0) {
      return `<span class="success-badge">✓ All alerts covered</span>`;
    }

    // Count different backend finding codes
    const noMap = auditResults.filter((r) => r.code === CODE_NO_ALERT_TICKER).length;
    const singles = auditResults.filter((r) => r.code === CODE_SINGLE_ALERT).length;
    const nones = auditResults.filter((r) => r.code === CODE_NO_ALERTS).length;

    // Color-coded counts for visual clarity
    return [
      `<span style="color: darkred">NoMap: ${noMap}</span>`,
      `<span style="color: darkorange">One: ${singles}</span>`,
      `<span style="color: silver">None: ${nones}</span>`,
      `Tot: ${auditResults.length}`,
    ].join(' | ');
  };

  /**
   * Creates an Alerts audit section
   * @param plugin - IAudit plugin (backend adapter) for alert coverage analysis
   * @param tickerHandler - Handler for ticker operations
   */
  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler
  ) {
    super();
    this.plugin = plugin;
  }
}
