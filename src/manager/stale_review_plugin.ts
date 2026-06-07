import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IRecentManager } from './recent';
import { ITickerManager } from './ticker';
import { IWatchManager } from './watch';
import { Constants } from '../models/constant';

/**
 * Stale Review Audit plugin (FR-016): detects tickers not opened within a configurable
 * review window so operators can prune or re-validate neglected instruments.
 *
 * Skips tickers that belong to ANY backend-derived watch category.
 */
export class StaleReviewPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.STALE_REVIEW;
  public readonly title = 'Stale Review';

  constructor(
    private readonly recentManager: IRecentManager,
    private readonly tickerManager: ITickerManager,
    private readonly watchManager: IWatchManager,
    private readonly thresholdDays: number = Constants.AUDIT.STALE_REVIEW_THRESHOLD_DAYS
  ) {
    super();
  }

  /**
   * Runs stale review audit. Audits entire ticker universe — targets not supported.
   * @throws Error if targets array is provided
   * @returns Promise resolving to array of audit results for stale tickers
   */
  async run(targets?: string[]): Promise<AuditResult[]> {
    if (targets) {
      throw new Error('Stale review audit does not support targeted mode');
    }

    const cutOffPeriod = this.thresholdDays * 24 * 60 * 60 * 1000;

    const trackedTickers = await this.tickerManager.listTickers({});
    const allTvTickers = trackedTickers.map((t) => t.ticker);

    // Classify all tracked tickers in one backend call
    const categoryMap = await this.watchManager.getTickerCategories(allTvTickers);
    const results: AuditResult[] = [];

    for (const ticker of trackedTickers) {
      const tvTicker = ticker.ticker;

      // Skip tickers that belong to any watch category
      if (categoryMap.has(tvTicker)) {
        continue;
      }

      if (!this.recentManager.isRecent(tvTicker, cutOffPeriod)) {
        results.push({
          pluginId: this.id,
          code: 'STALE_TICKER',
          target: tvTicker,
          message: `${tvTicker}: not recently opened`,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: { tvTicker },
        });
      }
    }

    return results;
  }
}
