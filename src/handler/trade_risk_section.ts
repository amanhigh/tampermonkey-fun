import { AuditResult } from '../models/audit';
import { IAuditSection } from './audit_section';
import { IAudit } from '../models/audit';
import { BaseAuditSection } from './audit_section_base';
import { ITickerHandler } from './ticker';
import { IKiteManager } from '../manager/kite';
import { Notifier } from '../util/notify';
import { Constants } from '../models/constant';

/**
 * Trade Risk Multiple Audit Section
 * Displays GTT orders with non-standard risk multiples
 *
 * Features:
 * - Left-click: Open tvTicker in TradingView for order adjustment
 * - Right-click: Delete the underlying GTT order
 * - Fix All: Bulk-delete all non-compliant orders
 */
export class TradeRiskSection extends BaseAuditSection implements IAuditSection {
  readonly id = Constants.AUDIT.PLUGINS.TRADE_RISK;
  readonly title = 'Trade Risk Multiple';
  readonly description = 'GTT orders whose risk size is not a valid multiple of the configured risk unit (6400 / 3200)';
  readonly order = 10;

  // Action labels
  readonly leftActionLabel = 'Open';
  readonly rightActionLabel = 'Delete Order';

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = async (result: AuditResult): Promise<void> => {
    const tvTicker = result.target;
    if (tvTicker) {
      await this.tickerHandler.openTicker(tvTicker);
    } else {
      Notifier.warn(`No tvTicker found for ${result.target}`);
    }
  };

  private allResults: AuditResult[] = [];

  readonly onRightClick = async (result: AuditResult): Promise<boolean> => {
    const tvTicker = result.target;
    // Find all non-compliant orders for this ticker
    const tickerResults = this.allResults.filter((r) => r.target === tvTicker);
    const orderIds = tickerResults.map((r) => r.data?.orderId as string | undefined).filter((id): id is string => !!id);

    if (orderIds.length === 0) {
      Notifier.warn('No order ID found for this finding');
      return false;
    }

    await Promise.all(
      orderIds.map(async (orderId) => {
        await this.kiteManager.deleteOrder(orderId);
      })
    );
    Notifier.success(`✓ Deleted ${orderIds.length} order(s) for ${tvTicker}`);
    return true;
  };

  readonly onFixAll = async (results: AuditResult[]): Promise<void> => {
    let totalDeleted = 0;
    const deletePromises: Promise<void>[] = [];
    results.forEach((result) => {
      const orderId = result.data?.orderId as string | undefined;
      if (orderId) {
        deletePromises.push(this.kiteManager.deleteOrder(orderId));
        totalDeleted++;
      }
    });
    await Promise.all(deletePromises);
    Notifier.success(`✓ Deleted ${totalDeleted} non-compliant order(s)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    this.allResults = results;
    if (results.length === 0) {
      return `<span class="success-badge">✓ No ${this.title.toLowerCase()} issues</span>`;
    }
    return `<span style="color: darkred">${this.title}: ${results.length}</span>`;
  };

  constructor(
    plugin: IAudit,
    private readonly tickerHandler: ITickerHandler,
    private readonly kiteManager: IKiteManager
  ) {
    super();
    this.plugin = plugin;
  }
}
