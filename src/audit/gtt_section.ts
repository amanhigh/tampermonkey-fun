import { IAuditSection } from './section';
import { IAudit, AuditResult } from '../models/audit';
import { BaseAuditSection } from './base_section';
import { ITickerHandler } from '../handler/ticker';
import { IKiteManager } from '../manager/kite';
import { AUDIT_IDS } from '../models/audit_ids';
import { Notifier } from '../util/notify';

/**
 * GTT Orders Audit Section
 * Displays unwatched GTT orders with pagination
 *
 * Features:
 * - Left-click: Open ticker in TradingView
 * - Right-click: Delete GTT orders with confirmation
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
    try {
      // Extract order IDs from result data
      const orderIds = result.data?.orderIds as string[] | undefined;
      const tvTicker = result.target;

      // Validation
      if (!orderIds || orderIds.length === 0) {
        Notifier.warn('No GTT orders found for this ticker');
        return;
      }

      // Build confirmation message
      const message =
        `Delete ${orderIds.length} GTT order(s) for ${tvTicker}?\n\n` +
        `Order IDs: ${orderIds.join(', ')}\n\n` +
        `This will permanently delete these orders from Kite.`;

      // Show confirmation dialog
      if (!confirm(message)) {
        Notifier.info('Deletion cancelled');
        return;
      }

      // Show progress notification
      Notifier.info(`Deleting ${orderIds.length} GTT order(s)...`);

      // Delete all orders for this ticker
      orderIds.forEach((orderId) => {
        this.kiteManager.deleteOrder(orderId);
      });

      // Success notification
      Notifier.success(`Deleted ${orderIds.length} GTT order(s) for ${tvTicker}`);
    } catch (error) {
      Notifier.error(`Failed to delete GTT orders: ${error}`);
    }
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
   * @param kiteManager - Manager for Kite operations (GTT order deletion)
   */
  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly kiteManager: IKiteManager
  ) {
    super();
    this.plugin = plugin;
  }
}
