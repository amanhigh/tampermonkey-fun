/**
 * Interface and implementation for handling watchlist-related events and updates
 */

import { ITradingViewScreenerManager } from '../manager/screener';
import { ITradingViewManager } from '../manager/tv';
import { IWatchManager } from '../manager/watch';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { Notifier } from '../util/notify';
import { ISyncUtil } from '../util/sync';

/**
 * Handles watchlist-related events and UI updates
 */
export interface IWatchListHandler {
  /**
   * Handles watchlist change events
   * Updates all related components including:
   * - Watchlist and screener views reset
   * - UI component painting (watchlist, screener, headers)
   * - Filter application
   */
  onWatchListChange(): void;

  /**
   * Handles watchlist cleanup operations
   * - Performs dry run to check potential deletion count
   * - Auto updates if deletions < 5
   * - Prompts for confirmation if deletions >= 5
   * - Saves changes after cleanup
   */
  handleWatchlistCleanup(): Promise<void>;
}

/**
 * Handles all watchlist-related events and updates
 */
export class WatchListHandler implements IWatchListHandler {
  constructor(
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly screenerManager: ITradingViewScreenerManager,
    private readonly tradingViewManager: ITradingViewManager,
    private readonly syncUtil: ISyncUtil,
    private readonly watchManager: IWatchManager
  ) {}

  /** @inheritdoc */
  public onWatchListChange(): void {
    this.syncUtil.waitOn('watchListChangeEvent', 2, () => {
      // Reset and update watchlist state
      this.resetWatchListState();

      // Update UI components
      this.updateUIComponents();

      // Apply filters
      this.applyFilters();
    });
  }

  /** @inheritdoc */
  public async handleWatchlistCleanup(): Promise<void> {
    // Perform dry run to get potential deletion count
    const dryRunCount = this.watchManager.dryRunClean();

    //Clean Order Set after unfilter completes
    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        if (dryRunCount < 5) {
          // Auto update if deletion count is less than 5
          const cleanCount = this.watchManager.clean();
          await this.watchManager.save();
        } else {
          // Prompt user for confirmation if deletion count is 5 or more
          const confirmDeletion = confirm(`Potential Deletions: ${dryRunCount}. Proceed with cleanup?`);

          if (confirmDeletion) {
            const cleanCount = this.watchManager.clean();
            await this.watchManager.save();
          } else {
            Notifier.message('Cleanup aborted by user.', 'red');
          }
        }
        resolve();
      }, 1000);
    });
  }

  /**
   * Resets the watchlist state
   * @private
   */
  private resetWatchListState(): void {
    // Reset both watchlist and screener views
    this.watchlistManager.resetWatchList();
  }

  /**
   * Updates all UI components related to watchlist
   * @private
   */
  private updateUIComponents(): void {
    // Paint watchlist items
    this.watchlistManager.paintWatchList();

    // Paint screener items if visible
    this.screenerManager.paintScreener();

    // Paint the name in header
    this.tradingViewManager.paintName();

    // Update alert feed with watchlist changes
    this.watchlistManager.paintAlertFeedEvent();
  }

  private applyFilters(): void {
    this.watchlistManager.applyFilters();
  }
}
