import { AuditResult } from '../models/audit';
import { BaseAuditPlugin } from './audit_plugin_base';
import { IRecentTickerRepo } from '../repo/recent';
import { ITickerRepo } from '../repo/ticker';
import { IWatchManager } from './watch';
import { Constants } from '../models/constant';

/**
 * Stale Review Audit plugin (FR-016): detects tickers not opened within a configurable
 * review window so operators can prune or re-validate neglected instruments.
 *
 * Skips watched tickers and emits FAIL results only for unwatched tickers
 * whose last-opened date exceeds the threshold.
 */
export class StaleReviewPlugin extends BaseAuditPlugin {
  public readonly id = Constants.AUDIT.PLUGINS.STALE_REVIEW;
  public readonly title = 'Stale Review';

  constructor(
    private readonly recentRepo: IRecentTickerRepo,
    private readonly tickerRepo: ITickerRepo,
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

    const now = Date.now();
    const thresholdMs = this.thresholdDays * 24 * 60 * 60 * 1000;
    const cutoff = now - thresholdMs;

    const results: AuditResult[] = [];

    this.tickerRepo.getAllKeys().forEach((tvTicker: string) => {
      if (this.watchManager.isWatched(tvTicker)) {
        return;
      }

      const lastOpened = this.recentRepo.get(tvTicker) ?? 0;

      if (lastOpened < cutoff) {
        const daysSinceOpen = lastOpened > 0 ? Math.floor((now - lastOpened) / (24 * 60 * 60 * 1000)) : -1;

        const message =
          daysSinceOpen >= 0 ? `${tvTicker}: last opened ${daysSinceOpen} days ago` : `${tvTicker}: never opened`;

        results.push({
          pluginId: this.id,
          code: 'STALE_TICKER',
          target: tvTicker,
          message,
          severity: 'MEDIUM',
          status: 'FAIL',
          data: {
            tvTicker,
            lastOpened,
            daysSinceOpen,
          },
        });
      }
    });

    return Promise.resolve(results);
  }
}
