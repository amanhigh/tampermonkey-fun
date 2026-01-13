import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './base';
import { IKiteRepo } from '../repo/kite';
import { IWatchManager } from '../manager/watch';
import { AUDIT_IDS } from '../models/audit_ids';

/**
 * GTT Unwatched Audit plugin: identifies GTT orders for tickers not in watchlists.
 * Checks if GTT order tickers are in Orange (category 0), Red (category 1), or Lime (category 4) watchlists.
 * Emits FAIL results only for unwatched GTT orders.
 */
export class GttUnwatchedAudit extends BaseAuditPlugin {
  public readonly id = AUDIT_IDS.GTT_UNWATCHED;
  public readonly title = 'GTT Unwatched Orders';

  constructor(
    private readonly kiteRepo: IKiteRepo,
    private readonly watchManager: IWatchManager
  ) {
    super();
  }

  /**
   * Runs GTT unwatched audit by fetching GTT orders and checking against watchlists.
   * Note: targets parameter is not used for GTT audit (audits all GTT orders).
   * @returns Promise resolving to array of audit results for unwatched GTT tickers
   */
  async run(): Promise<AuditResult[]> {
    // Fetch GTT data from repository (breaks circular dependency with KiteManager)
    const gttData = await this.kiteRepo.getGttRefereshEvent();
    const allGttTickers = Object.keys(gttData.orders);

    // Get watched categories (Orange, Red, Running Trades)
    const firstList = this.watchManager.getCategory(0); // Orange list
    const secondList = this.watchManager.getCategory(1); // Red list
    const runningTradesList = this.watchManager.getCategory(4); // Lime list - Running trades

    // Find tickers with GTT orders that are not in any watchlist
    const results: AuditResult[] = [];
    allGttTickers.forEach((tvTicker: string) => {
      // Check if GTT ticker is in any watched category
      const isWatched = firstList.has(tvTicker) || secondList.has(tvTicker) || runningTradesList.has(tvTicker);
      if (!isWatched) {
        results.push({
          pluginId: this.id,
          code: 'UNWATCHED_GTT',
          target: tvTicker,
          message: `${tvTicker}: GTT order exists but ticker not in watchlist`,
          severity: 'HIGH',
          status: 'FAIL',
        });
      }
    });

    return results;
  }
}
