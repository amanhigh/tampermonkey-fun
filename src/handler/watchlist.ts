/**
 * Interface and implementation for handling watchlist-related events and updates
 */

import { IHeaderManager } from '../manager/header';
import { ITradingViewScreenerManager } from '../manager/screener';
import { IWatchManager } from '../manager/watch';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { ISyncUtil } from '../util/sync';
import { IDomManager } from '../manager/dom';
import { IAlertFeedManager } from '../manager/alertfeed';
import { WatchCategoryId } from '../models/watch';

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
   * Records the selected ticker for a given watch category.
   * @param categoryId The category identifier to record into.
   */
  recordSelectedTicker(categoryId: WatchCategoryId): void;

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
    private readonly domManager: IDomManager,
    private readonly alertFeedManager: IAlertFeedManager
  ) {}

  /** @inheritdoc */
  public onWatchListChange(): void {
    this.syncUtil.waitOn('watchListChangeEvent', 20, () => {
      // Paint watchlist items
      void this.watchlistManager.paintWatchList();

      // Paint screener items if visible
      void this.screenerManager.paintScreener();

      // Paint header items
      void this.headerManager.paintHeader();

      // Update alert feed with watchlist changes
      void this.alertFeedManager.createAlertFeedEvent(this.domManager.getTicker());
    });
  }

  /** @inheritdoc */
  public recordSelectedTicker(categoryId: WatchCategoryId): void {
    const selectedTickers = this.domManager.getSelectedTickers();
    this.watchManager.recordCategory(categoryId, selectedTickers);
    this.onWatchListChange();
  }

  /** @inheritdoc */
  public applyDefaultFilters(): void {
    this.watchlistManager.applyDefaultFilters();
  }
}
