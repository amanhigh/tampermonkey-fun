import { IAuditSection } from './section';
import { IAudit, AuditResult } from '../models/audit';
import { BaseAuditSection } from './base_section';
import { ITickerHandler } from '../handler/ticker';
import { IWatchManager } from '../manager/watch';
import { Notifier } from '../util/notify';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * GTT Orders Audit Section
 * Displays unwatched GTT orders with pagination
 *
 * Features:
 * - Left-click: Open ticker in TradingView
 * - Right-click: Add to watchlist
 * - Pagination: Navigate through large result sets
 * - Auto-refresh: Updates after each action
 *
 * Pattern:
 * - Receives plugin via direct injection (not via registry)
 * - Plugin contains the business logic for fetching/validating GTT orders
 * - Section defines the UI specification and interaction handlers
 */
export class GttAuditSection extends BaseAuditSection implements IAuditSection {
  // Identity - shares ID with GTT_UNWATCHED plugin
  readonly id = AUDIT_IDS.GTT_UNWATCHED;
  readonly title = 'GTT Orders';

  // Data source (injected directly, not fetched from registry)
  readonly plugin: IAudit;

  // Presentation
  readonly limit = 10;
  readonly context: unknown = undefined;

  // Interaction handlers
  readonly onLeftClick = (result: AuditResult) => {
    const tvTicker = result.target;
    this.tickerHandler.openTicker(tvTicker);
  };

  readonly onRightClick = (result: AuditResult) => {
    const tvTicker = result.target;
    const currentCategory = this.watchManager.getCategory(0);
    // FIXME: #C  Should this delete the GTT Order ?
    const newTickers = Array.from(currentCategory);
    newTickers.push(tvTicker);
    this.watchManager.recordCategory(0, newTickers);
    Notifier.success(`✅ Added ${tvTicker} to watchlist`);
  };

  readonly headerFormatter = (auditResults: AuditResult[]) => {
    if (auditResults.length === 0) {
      return `<span class="success-badge">✓ All orders watched</span>`;
    }
    return `<span class="count-badge">Unwatched: ${auditResults.length}</span>`;
  };

  /**
   * Creates a GTT audit section
   * @param plugin - IAudit plugin for GTT unwatched orders (injected directly)
   * @param tickerHandler - Handler for ticker operations
   * @param watchManager - Manager for watchlist operations
   */
  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly watchManager: IWatchManager
  ) {
    super();
    this.plugin = plugin;
  }
}
