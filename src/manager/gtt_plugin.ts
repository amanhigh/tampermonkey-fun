import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IKiteRepo } from '../repo/kite';
import { IWatchManager } from './watch';
import { Constants } from '../models/constant';
import { WatchCategoryId } from '../models/watch';

/**
 * GTT Unwatched Audit plugin: identifies GTT orders for tickers not in watchlists.
 * Only treats SET_JOURNAL and RUNNING as watched-for-GTT (per PRD).
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

    // Classify each GTT ticker individually — only SET_JOURNAL and RUNNING
    // are treated as watched-for-GTT
    const results: AuditResult[] = [];

    for (const tvTicker of allGttTickers) {
      const category = await this.watchManager.getTickerCategory(tvTicker);
      const isWatchedForGtt = category?.id === WatchCategoryId.SET_JOURNAL || category?.id === WatchCategoryId.RUNNING;

      if (!isWatchedForGtt) {
        const ordersForTicker = gttData.orders[tvTicker] || [];
        const orderIds = ordersForTicker.map((order) => order.id);
        results.push({
          code: 'UNWATCHED_GTT',
          target: tvTicker,
          severity: 'HIGH',
          data: {
            orderIds: orderIds,
          },
        });
      }
    }

    return results;
  }
}
