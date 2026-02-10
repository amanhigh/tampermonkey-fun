import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IKiteRepo } from '../repo/kite';
import { Constants } from '../models/constant';
import { Order } from '../models/kite';

/**
 * Trade Risk Multiple Audit plugin: identifies GTT orders with non-standard risk multiples.
 * Checks that per-trade risk (abs(entry - stop) × quantity) aligns with the approved
 * risk ladder: full risk limit (RISK_LIMIT) or half (RISK_LIMIT / 2).
 * Allows ±1% rounding tolerance.
 * Emits FAIL results only for trades outside the approved ladder.
 */
export class TradeRiskPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.TRADE_RISK;
  public readonly title = 'Trade Risk Multiple';

  // HACK: Move to Constants
  private readonly TOLERANCE = 0.01; // ±1% rounding tolerance

  constructor(private readonly kiteRepo: IKiteRepo) {
    super();
  }

  /**
   * Runs trade risk audit by checking all GTT orders for risk multiple compliance.
   * Audits entire repository - targets parameter not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for non-compliant trades
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Trade risk audit does not support targeted mode');
    }

    const riskLimit = Constants.TRADING.ORDER.RISK_LIMIT;
    const halfRisk = riskLimit / 2;

    const gttData = await this.kiteRepo.getGttRefereshEvent();
    const results: AuditResult[] = [];

    Object.entries(gttData.orders).forEach(([tvTicker, orders]) => {
      this.processOrdersForTicker(tvTicker, orders, riskLimit, halfRisk, results);
    });

    return results;
  }

  /**
   * Processes all orders for a single ticker and adds violations to results
   */
  private processOrdersForTicker(
    tvTicker: string,
    orders: Order[],
    riskLimit: number,
    halfRisk: number,
    results: AuditResult[]
  ): void {
    orders.forEach((order) => {
      // Only check two-leg (OCO) orders which have entry implied via single-leg pair
      // For single-leg buy orders: prices[0] = entry trigger
      // For two-leg OCO orders: prices[0] = stop, prices[1] = target
      // HACK: Make order type enum
      if (order.type === 'two-leg' && order.prices.length >= 2) {
        const stop = order.prices[0];
        // Find corresponding single-leg buy order for this ticker to get entry
        const buyOrder = orders.find((o) => o.type === 'single' && o.prices.length >= 1);
        if (!buyOrder) {
          return;
        }

        const entry = buyOrder.prices[0];
        const risk = Math.abs(entry - stop) * order.qty;

        if (!this.isValidRiskMultiple(risk, riskLimit, halfRisk)) {
          results.push({
            pluginId: this.id,
            code: 'INVALID_RISK_MULTIPLE',
            target: tvTicker,
            message: `${tvTicker}: Risk ₹${risk.toFixed(0)} not a multiple of ${halfRisk}/${riskLimit}`,
            severity: 'HIGH',
            status: 'FAIL',
            data: {
              tvTicker,
              orderId: order.id,
              entry,
              stop,
              quantity: order.qty,
              computedRisk: risk,
              expectedMultiples: [halfRisk, riskLimit],
            },
          });
        }
      }
    });
  }

  /**
   * Checks if a risk value matches the approved ladder within tolerance
   * @param risk Computed risk value
   * @param fullRisk Full risk limit
   * @param halfRisk Half risk limit
   * @returns True if risk is within tolerance of an approved multiple
   */
  private isValidRiskMultiple(risk: number, fullRisk: number, halfRisk: number): boolean {
    const isFullRisk = Math.abs(risk - fullRisk) / fullRisk <= this.TOLERANCE;
    const isHalfRisk = Math.abs(risk - halfRisk) / halfRisk <= this.TOLERANCE;
    return isFullRisk || isHalfRisk;
  }
}
