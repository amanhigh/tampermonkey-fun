import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { Notifier } from '../util/notify';
import { AlertState } from '../models/alert';
import { Constants } from '../models/constant';

/**
 * Alerts Audit Section
 * Displays tracked TV tickers with weak alert coverage: SINGLE_ALERT or NO_ALERTS
 *
 * Features:
 * - Prioritizes SINGLE_ALERT over NO_ALERTS in display
 * - Left-click: Open ticker in TradingView
 * - Right-click: Stop tracking ticker
 *
 * Pattern:
 * - Receives plugin via direct injection (not via registry)
 * - Plugin contains the business logic for analyzing alerts
 * - Section defines the UI specification and interaction handlers
 */
export class AlertsAuditSection extends BaseAuditSection implements IAuditSection {
  // Identity - shares ID with ALERTS plugin
  readonly id = Constants.AUDIT.PLUGINS.ALERTS;
  readonly title = 'Alerts Coverage';
  readonly description = 'Audits alert coverage for every tracked TV ticker (NO_ALERTS / SINGLE_ALERT)';
  readonly order = 0;

  // Action labels
  readonly leftActionLabel = 'Open';
  readonly rightActionLabel = 'Stop';

  // Data source (injected directly, not fetched from registry)
  readonly plugin: IAudit;

  // Presentation
  readonly limit = 10; // Show up to 10 items (prioritize SINGLE_ALERT)
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

    // Count different states
    const singles = auditResults.filter((r) => r.code === AlertState.SINGLE_ALERT).length;
    const nones = auditResults.filter((r) => r.code === AlertState.NO_ALERTS).length;

    // Color-coded counts matching button colors for visual clarity
    // One (SINGLE_ALERT): darkorange | None (NO_ALERTS): silver | Tot: default
    return [
      `<span style="color: darkorange">One: ${singles}</span>`,
      `<span style="color: silver">None: ${nones}</span>`,
      `Tot: ${auditResults.length}`,
    ].join(' | ');
  };

  /**
   * Creates an Alerts audit section
   * @param plugin - IAudit plugin for alerts analysis (injected directly)
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
