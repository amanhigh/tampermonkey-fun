import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * ReverseGolden Integrity Audit Section (FR-007)
 * Displays pairs that exist without TradingView ticker mappings
 *
 * Features:
 * - Left-click: Open ticker in TradingView
 * - Right-click: Remove problematic pair mapping
 * - Pagination: Navigate through large result sets
 *
 * Pattern:
 * - Receives plugin via direct injection (not via registry)
 * - Plugin contains the business logic for finding unmapped pairs
 * - Section defines the UI specification and interaction handlers
 */
export class ReverseGoldenSection extends BaseAuditSection implements IAuditSection {
  // Identity - shares ID with REVERSE_GOLDEN plugin
  readonly id = Constants.AUDIT.PLUGINS.REVERSE_GOLDEN;
  readonly title = 'ReverseGolden Integrity';
  readonly description = 'Investing tickers in PairRepo that have no corresponding TradingView ticker in TickerRepo';

  // Data source (injected directly, not fetched from registry)
  readonly plugin: IAudit;

  // Presentation
  readonly limit = 10; // Show up to 10 unmapped pairs
  readonly context: unknown = undefined;

  // Interaction handlers
  readonly onLeftClick = (result: AuditResult) => {
    const investingTicker = result.target;
    this.tickerHandler.openTicker(investingTicker);
  };

  readonly onRightClick = (result: AuditResult): void => {
    const investingTicker = result.target;
    this.pairHandler.stopTrackingByInvestingTicker(investingTicker);
  };

  readonly onFixAll = (results: AuditResult[]) => {
    results.forEach((result) => {
      this.pairHandler.stopTrackingByInvestingTicker(result.target);
    });
    Notifier.success(`⏹ Stopped tracking ${results.length} ticker(s)`);
  };

  /**
   * Header formatter showing count of reverse golden violations
   */
  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No ${this.title.toLowerCase()} issues</span>`;
    }
    return `<span class="count-badge">${this.title}: ${results.length}</span>`;
  };

  /**
   * Constructor with injected dependencies
   * @param plugin ReverseGolden audit plugin
   * @param tickerHandler For opening tickers
   * @param pairHandler For cleanup operations (handles watchlist repaint internally)
   */
  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly pairHandler: IPairHandler
  ) {
    super();
    this.plugin = plugin;
  }
}
