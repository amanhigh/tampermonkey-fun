import { IAuditSection } from './audit_section';
import { IAudit, AuditResult } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IKiteManager } from '../manager/kite';
import { Constants } from '../models/constant';
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
  readonly id = Constants.AUDIT.PLUGINS.GTT_UNWATCHED;
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

  readonly onFixAll = (results: AuditResult[]) => {
    let totalDeleted = 0;
    results.forEach((result) => {
      const orderIds = result.data?.orderIds as string[] | undefined;
      if (orderIds && orderIds.length > 0) {
        orderIds.forEach((orderId) => {
          this.kiteManager.deleteOrder(orderId);
        });
        totalDeleted += orderIds.length;
      }
    });
    Notifier.success(`Deleted ${totalDeleted} GTT order(s) for ${results.length} ticker(s)`);
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
