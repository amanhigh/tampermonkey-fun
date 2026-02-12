import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IRecentTickerRepo } from '../repo/recent';
import { ITickerRepo } from '../repo/ticker';
import { IWatchManager } from './watch';
import { IFlagManager } from './flag';
import { Constants } from '../models/constant';

/**
 * Stale Review Audit plugin (FR-016): detects tickers not opened within a configurable
 * review window so operators can prune or re-validate neglected instruments.
 *
 * Emits FAIL results only for tickers whose last-opened date exceeds the threshold.
 */
export class StaleReviewPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.STALE_REVIEW;
  public readonly title = 'Stale Review';

  // HACK: Move to Constants.
  private static readonly DEFAULT_THRESHOLD_DAYS = 90;
  // FIXME: Why we have categories simply pick Non Watched Tickers and Check Recency.
  private static readonly TOTAL_CATEGORIES = 8;
  // FIXME: Add Left Click to open Ticker in TradingView.
  // FIXME: Add Right Click to Stop Tracking.

  constructor(
    private readonly recentRepo: IRecentTickerRepo,
    private readonly tickerRepo: ITickerRepo,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly thresholdDays: number = StaleReviewPlugin.DEFAULT_THRESHOLD_DAYS
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

    const now = Date.now();
    const thresholdMs = this.thresholdDays * 24 * 60 * 60 * 1000;
    const cutoff = now - thresholdMs;

    const results: AuditResult[] = [];

    this.tickerRepo.getAllKeys().forEach((tvTicker: string) => {
      const lastOpened = this.recentRepo.get(tvTicker) ?? 0;

      if (lastOpened < cutoff) {
        const daysSinceOpen = lastOpened > 0 ? Math.floor((now - lastOpened) / (24 * 60 * 60 * 1000)) : -1;
        // BUG: Don't use watch or flag categories directly highlight them simplify. 
        const watchCategories = this.getWatchCategories(tvTicker);
        const flagCategories = this.getFlagCategories(tvTicker);

        const message =
          daysSinceOpen >= 0 ? `${tvTicker}: last opened ${daysSinceOpen} days ago` : `${tvTicker}: never opened`;

        // FIXME: Ignore Tickers that are watched.
        results.push({
          pluginId: this.id,
          code: 'STALE_TICKER',
          target: tvTicker,
          message,
          // BUG: Only keep medium priority simplify.
          severity: daysSinceOpen < 0 ? 'HIGH' : 'MEDIUM',
          status: 'FAIL',
          data: {
            tvTicker,
            lastOpened,
            daysSinceOpen,
            watchCategories,
            flagCategories,
          },
        });
      }
    });

    return Promise.resolve(results);
  }

  private getWatchCategories(tvTicker: string): number[] {
    const categories: number[] = [];
    for (let i = 0; i < StaleReviewPlugin.TOTAL_CATEGORIES; i++) {
      try {
        if (this.watchManager.getCategory(i).has(tvTicker)) {
          categories.push(i);
        }
      } catch {
        // Category not initialized
      }
    }
    return categories;
  }

  private getFlagCategories(tvTicker: string): number[] {
    const categories: number[] = [];
    for (let i = 0; i < StaleReviewPlugin.TOTAL_CATEGORIES; i++) {
      try {
        if (this.flagManager.getCategory(i).has(tvTicker)) {
          categories.push(i);
        }
      } catch {
        // Category not initialized
      }
    }
    return categories;
  }
}
