import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { ISymbolManager } from '../manager/symbol';
import { IPairHandler } from './pair';
import { Notifier } from '../util/notify';
import { AlertState } from '../models/alert';
import { Constants } from '../models/constant';

/**
 * Alerts Audit Section
 * Displays alerts with coverage status: SINGLE_ALERT, NO_ALERTS, NO_PAIR
 *
 * Features:
 * - Filters out watched tickers (don't show if in watchlist)
 * - Filters out invalid mappings (shows as separate category)
 * - Prioritizes SINGLE_ALERT over NO_ALERTS in display
 * - Left-click: Open ticker in TradingView
 * - Right-click: Delete pair mapping
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
  readonly description =
    'Audits alert coverage for every tracked Investing ticker (NO_PAIR / NO_ALERTS / SINGLE_ALERT)';
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
    const investingTicker = result.target;
    const tvTicker = this.tryMapTvTicker(investingTicker);
    this.tickerHandler.openTicker(tvTicker);
  };

  readonly onRightClick = (result: AuditResult) => {
    const investingTicker = result.target;
    this.pairHandler.stopTrackingByInvestingTicker(investingTicker);
  };

  readonly onFixAll = (results: AuditResult[]) => {
    results.forEach((result) => {
      this.pairHandler.stopTrackingByInvestingTicker(result.target);
    });
    Notifier.success(`⏹ Stopped tracking ${results.length} ticker(s)`);
  };

  readonly headerFormatter = (auditResults: AuditResult[]) => {
    if (auditResults.length === 0) {
      return `<span class="success-badge">✓ All alerts covered</span>`;
    }

    // Count different states
    const singles = auditResults.filter((r) => r.code === AlertState.SINGLE_ALERT).length;
    const nones = auditResults.filter((r) => r.code === AlertState.NO_ALERTS).length;
    const invalids = auditResults.filter((r) => r.code === AlertState.NO_PAIR).length;

    // Color-coded counts matching button colors for visual clarity
    // One (SINGLE_ALERT): darkorange | None (NO_ALERTS): silver | Inv (NO_PAIR): darkred | Tot: default
    return [
      `<span style="color: darkorange">One: ${singles}</span>`,
      `<span style="color: silver">None: ${nones}</span>`,
      `<span style="color: darkred">Inv: ${invalids}</span>`,
      `Tot: ${auditResults.length}`,
    ].join(' | ');
  };

  /**
   * Creates an Alerts audit section
   * @param plugin - IAudit plugin for alerts analysis (injected directly)
   * @param tickerHandler - Handler for ticker operations
   * @param symbolManager - Manager for symbol mappings
   * @param pairManager - Manager for pair operations
   * @param watchListHandler - Handler for watchlist repaint after pair deletion
   */
  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly symbolManager: ISymbolManager,
    private readonly pairHandler: IPairHandler
  ) {
    super();
    this.plugin = plugin;
  }

  /**
   * Attempts to map an investing ticker to a TV ticker
   * @private
   * @param investingTicker The ticker symbol
   * @returns The mapped tv ticker or the original ticker if no mapping exists
   */
  private tryMapTvTicker(investingTicker: string): string {
    const tvTicker = this.symbolManager.investingToTv(investingTicker);
    return tvTicker || investingTicker;
  }
}
