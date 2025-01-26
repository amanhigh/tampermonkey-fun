/**
 * Interface and implementation for handling watchlist-related events and updates
 */

import { IHeaderManager } from '../manager/header';
import { ITradingViewScreenerManager } from '../manager/screener';
import { IWatchManager } from '../manager/watch';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { Notifier } from '../util/notify';
import { ISyncUtil } from '../util/sync';
import { ITickerManager } from '../manager/ticker';
import { IAlertFeedManager } from '../manager/alertfeed';

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

  /**
   * Records the selected ticker for a given category index.
   * @param categoryIndex The index of the category.
   */
  recordSelectedTicker(categoryIndex: number): void;

  /**
   * Applies default filters to the watchlist
   */
  applyDefaultFilters(): void;
}

/**
 * Handles all watchlist-related events and updates
 */
export class WatchListHandler implements IWatchListHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly screenerManager: ITradingViewScreenerManager,
    private readonly headerManager: IHeaderManager,
    private readonly syncUtil: ISyncUtil,
    private readonly watchManager: IWatchManager,
    private readonly tickerManager: ITickerManager,
    private readonly alertFeedManager: IAlertFeedManager
  ) {}

  /** @inheritdoc */
  public onWatchListChange(): void {
    this.syncUtil.waitOn('watchListChangeEvent', 20, () => {
      // Paint watchlist items
      this.watchlistManager.paintWatchList();

      // Paint screener items if visible
      this.screenerManager.paintScreener();

      // Paint header items
      this.headerManager.paintHeader();

      // Update alert feed with watchlist changes
      void this.alertFeedManager.createAlertFeedEvent(this.tickerManager.getTicker());
    });
  }

  /** @inheritdoc */
  public async handleWatchlistCleanup(): Promise<void> {
    // Get current UI tickers
    const currentTickers = this.watchlistManager.getTickers();

    // Perform dry run to get potential deletion count
    const dryRunCount = this.watchManager.dryRunClean(currentTickers);

    // Wait for unfilter to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Handle cleanup based on deletion count
    if (dryRunCount < 5) {
      this.executeCleanup(currentTickers);
    } else {
      this.executeCleanupWithConfirmation(currentTickers, dryRunCount);
    }
  }

  /**
   * Executes cleanup for small number of deletions
   * @private
   */
  private executeCleanup(currentTickers: string[]): void {
    const cleanCount = this.watchManager.clean(currentTickers);
    Notifier.success(`Cleaned ${cleanCount} items`);
  }

  /**
   * Executes cleanup with user confirmation for larger deletions
   * @private
   */
  private executeCleanupWithConfirmation(currentTickers: string[], count: number): void {
    const confirmDeletion = confirm(`🚨 Potential Deletions: ${count}. Proceed with cleanup?`);
    if (confirmDeletion) {
      this.executeCleanup(currentTickers);
    } else {
      Notifier.yellow('🚫 Cleanup aborted by user.');
    }
  }

  /** @inheritdoc */
  public recordSelectedTicker(categoryIndex: number): void {
    const tvTicker = this.tickerManager.getTicker();
    this.watchManager.recordCategory(categoryIndex, [tvTicker]);
    this.onWatchListChange();
  }

  /** @inheritdoc */
  public applyDefaultFilters(): void {
    this.watchlistManager.applyDefaultFilters();
  }
}
