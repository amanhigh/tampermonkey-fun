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

  readonly plugin: IAudit;

  readonly limit = 10;
  readonly context: unknown = undefined;

  readonly onLeftClick = (result: AuditResult) => {
    const tvTicker = result.target;
    if (tvTicker) {
      this.tickerHandler.openTicker(tvTicker);
    } else {
      Notifier.warn(`No tvTicker found for ${result.target}`);
    }
  };

  readonly onRightClick = (result: AuditResult): void => {
    const orderId = result.data?.orderId as string | undefined;
    if (!orderId) {
      Notifier.warn('No order ID found for this finding');
      return;
    }
    // BUG: Handle more than one order for Ticker ?
    this.kiteManager.deleteOrder(orderId);
    Notifier.success(`✓ Deleted order ${orderId} for ${result.target}`);
  };

  readonly onFixAll = (results: AuditResult[]): void => {
    let totalDeleted = 0;
    results.forEach((result) => {
      const orderId = result.data?.orderId as string | undefined;
      if (orderId) {
        this.kiteManager.deleteOrder(orderId);
        totalDeleted++;
      }
    });
    Notifier.success(`✓ Deleted ${totalDeleted} non-compliant order(s)`);
  };

  readonly headerFormatter = (results: AuditResult[]): string => {
    if (results.length === 0) {
      return `<span class="success-badge">✓ All trades compliant</span>`;
    }
    return `<span style="color: darkred">Non-compliant: ${results.length}</span>`;
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
