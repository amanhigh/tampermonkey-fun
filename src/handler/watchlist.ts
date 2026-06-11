/**
 * Interface and implementation for handling watchlist-related events and updates
 */

import { IPaintManager } from '../manager/paint';
import { ICategoryManager } from '../manager/category';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { ISyncUtil } from '../util/sync';
import { TickerArea, TickerVisibility } from '../models/dom';
import { WatchCategoryId } from '../models/watch';
import { IDomManager } from '../manager/dom';
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
   * Records the selected ticker for a given watch category.
   * @param categoryId The category identifier to record into.
   */
  recordSelectedTicker(categoryId: WatchCategoryId): void;
}

/**
 * Handles all watchlist-related events and updates
 */
export class WatchListHandler implements IWatchListHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly paintManager: IPaintManager,
    private readonly syncUtil: ISyncUtil,
    private readonly categoryManager: ICategoryManager,
    private readonly domManager: IDomManager,
    private readonly alertFeedManager: IAlertFeedManager
  ) {}

  /** @inheritdoc */
  public onWatchListChange(): void {
    this.syncUtil.waitOn('watchListChangeEvent', 20, () => {
      // Full watchlist UI refresh: paint decals + summary + filters
      void this.watchlistManager.refresh();

      // Update alert feed with watchlist changes
      void this.alertFeedManager.createAlertFeedEvent(this.domManager.getTicker());
    });
  }

  /** @inheritdoc */
  public recordSelectedTicker(categoryId: WatchCategoryId): void {
    const type = this.domManager.isScreenerVisible() ? TickerArea.SCREENER : TickerArea.WATCHLIST;
    const selectedTickers = [...this.domManager.getTickers(type, TickerVisibility.SELECTED)];
    this.categoryManager.recordWatchCategory(categoryId, selectedTickers);

    // Targeted repaint: paintTickers handles WATCHLIST + SCREENER (if visible) + header
    if (selectedTickers.length > 0) {
      void this.paintManager.paintTickers(selectedTickers);
    }

    // Fast summary refresh without full visual repaint
    void this.watchlistManager.refreshSummary();
  }
}
