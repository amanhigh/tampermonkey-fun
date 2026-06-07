import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IKiteRepo } from '../repo/kite';
import { IWatchManager } from './watch';
import { Constants } from '../models/constant';
import { WatchCategoryId } from '../models/watch';

/**
 * GTT Unwatched Audit plugin: identifies GTT orders for tickers not in watchlists.
 * Only treats SET_JOURNAL and RUNNING_JOURNAL as watched-for-GTT (per PRD).
 */
export class GttPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.GTT_UNWATCHED;
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

    // Fetch watch categories for all GTT tickers
    const categoryMap = await this.watchManager.getTickerCategories(allGttTickers);

    // Find tickers with GTT orders that are not in SET_JOURNAL or RUNNING_JOURNAL
    const results: AuditResult[] = [];
    allGttTickers.forEach((tvTicker: string) => {
      const cat = categoryMap.get(tvTicker);
      const isWatchedForGtt = cat?.id === WatchCategoryId.SET_JOURNAL || cat?.id === WatchCategoryId.RUNNING_JOURNAL;

      if (!isWatchedForGtt) {
        const ordersForTicker = gttData.orders[tvTicker] || [];
        const orderIds = ordersForTicker.map((order) => order.id);
        results.push({
          pluginId: this.id,
          code: 'UNWATCHED_GTT',
          target: tvTicker,
          message: `${tvTicker}: ${orderIds.length} GTT order(s) exist but ticker not in SET/RUNNING watchlist`,
          severity: 'HIGH',
          status: 'FAIL',
          data: {
            orderIds: orderIds,
          },
        });
      }
    });

    return results;
  }
}
