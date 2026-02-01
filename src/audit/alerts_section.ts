import { AuditResult } from '../models/audit';
import { IAuditSection } from './section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './base_section';
import { ITickerHandler } from '../handler/ticker';
import { ISymbolManager } from '../manager/symbol';
import { IPairHandler } from '../handler/pair';
import { Notifier } from '../util/notify';
import { AlertState } from '../models/alert';
import { AUDIT_IDS } from '../models/audit_ids';

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
  readonly id = AUDIT_IDS.ALERTS;
  readonly title = 'Alerts Coverage';

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
    this.pairHandler.deletePairInfo(investingTicker);
    Notifier.red(`❌ Removed mapping for ${investingTicker}`);
  };

  /**
   * Dynamic button color based on alert state and mapping validity
   * Priority: darkred (invalid mapping) > darkorange (single alert) > darkgray (no alerts)
   */
  readonly buttonColorMapper = (result: AuditResult): string => {
    const state = result.code as AlertState;

    // First check: invalid mapping (NO_PAIR state)
    if (state === AlertState.NO_PAIR) {
      return 'darkred'; // Most urgent - broken mapping
    }

    // Second check: single alert (high priority)
    if (state === AlertState.SINGLE_ALERT) {
      return 'darkorange'; // Needs one more alert
    }

    // Third check: no alerts (medium priority)
    if (state === AlertState.NO_ALERTS) {
      return 'darkgray'; // Needs alerts
    }

    // Fallback (shouldn't happen for FAIL status results)
    return 'black';
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
   * @param pairHandler - Handler for pair operations
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
