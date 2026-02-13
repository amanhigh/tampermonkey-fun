import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Integrity Audit Section (FR-007)
 * Displays investingTickers in PairRepo that have no corresponding TradingView ticker in TickerRepo.
 *
 * Replaces the former GoldenSection and ReverseGoldenSection which displayed
 * identical results with different right-click actions.
 *
 * Features:
 * - Left-click: Open ticker in TradingView
 * - Right-click: Stop tracking with full cascade cleanup
 * - Fix All: Bulk stop-tracking with confirmation
 */
export class IntegritySection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.INTEGRITY;
  readonly title = 'Integrity';
  readonly description = 'Investing tickers in PairRepo that have no corresponding TradingView ticker in TickerRepo';
  readonly order = 2;

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
   * Header formatter showing count of integrity violations
   */
  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ No ${this.title.toLowerCase()} issues</span>`;
    }
    return `<span class="count-badge">${this.title}: ${results.length}</span>`;
  };

  /**
   * Constructor with injected dependencies
   * @param plugin Integrity audit plugin
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
