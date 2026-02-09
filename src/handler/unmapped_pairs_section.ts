import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Unmapped Pairs Audit Section
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
export class UnmappedPairsSection extends BaseAuditSection implements IAuditSection {
  // Identity - shares ID with UNMAPPED_PAIRS plugin
  readonly id = Constants.AUDIT.PLUGINS.UNMAPPED_PAIRS;
  readonly title = 'Unmapped Pairs';

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
    this.pairHandler.deletePairInfo(investingTicker);
    Notifier.red(`🗑️ Removed unmapped pair: ${investingTicker}`);
  };

  readonly onFixAll = (results: AuditResult[]) => {
    results.forEach((result) => {
      this.pairHandler.deletePairInfo(result.target);
    });
    Notifier.red(`🗑️ Removed ${results.length} unmapped pair(s)`);
  };

  /**
   * Header formatter showing count of unmapped pairs
   */
  readonly headerFormatter = (results: AuditResult[]): string => `Unmapped Pairs (${results.length})`;

  /**
   * Constructor with injected dependencies
   * @param plugin UnmappedPairsAudit plugin
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
