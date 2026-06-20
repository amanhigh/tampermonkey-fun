/**
 * Interface and implementation for handling watchlist-related events and updates
 */

import { ICategoryManager } from '../manager/category';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { ISyncUtil } from '../util/sync';
import { TickerArea, TickerVisibility } from '../models/dom';
import { WatchCategoryId } from '../models/watch';
import { IDomManager } from '../manager/dom';
import { IDomainEventConsumer, ISubscriber } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event';
import { Constants } from '../models/constant';

/**
 * Handles watchlist-related events and UI updates
 */
export interface IWatchListHandler extends IDomainEventConsumer {
  /**
   * Handles watchlist change events triggered by DOM observation.
   * Delegates to the watchlist manager which computes the actual diff
   * from its previous snapshot for targeted vs full refresh.
   */
  onWatchListChange(): void;

  /**
   * Marks selected ticker(s) with a given watch category.
   * @param categoryId The category identifier to assign.
   */
  markCategorySelectedTickers(categoryId: WatchCategoryId): void;

  /**
   * Toggle READY state for the current chart ticker only.
   * Uses the backend category to decide state, not the DOM ticker colour.
   * If current ticker is READY, clear it to WATCHED; otherwise mark READY.
   */
  toggleReadyCurrentTicker(): void;
}

/**
 * Handles all watchlist-related events and updates
 */
export class WatchListHandler implements IWatchListHandler {
  constructor(
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly syncUtil: ISyncUtil,
    private readonly categoryManager: ICategoryManager,
    private readonly domManager: IDomManager
  ) {}

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    // On first load, do full watchlist refresh (publishes WATCHLIST_CHANGED)
    subscriber.subscribe(DomainEventType.FIRST_LOAD, () => {
      void this.watchlistManager.refresh();
    });

    subscriber.subscribeMany(
      [
        DomainEventType.TICKER_CHANGED,
        DomainEventType.TICKER_TRACKING_STARTED,
        DomainEventType.TICKER_TRACKING_STOPPED,
        DomainEventType.TICKER_METADATA_CHANGED,
        DomainEventType.TICKER_CATEGORY_CHANGED,
      ],
      async (event) => {
        const tickers = 'tickers' in event ? event.tickers : [event.ticker];
        await this.repaintTickers(tickers);
      }
    );

    // Timeframe toggle can change watch category (long vs default daily)
    // so evict the stale category cache before repainting.
    subscriber.subscribe(DomainEventType.TICKER_TIMEFRAMES_CHANGED, async (event) => {
      this.categoryManager.evictTicker(event.ticker);
      await this.repaintTickers([event.ticker]);
    });
  }

  /** @inheritdoc */
  public onWatchListChange(): void {
    this.syncUtil.waitOn(Constants.DOM_EVENTS.WATCHLIST_CHANGE, 20, () => {
      void this.watchlistManager.refreshChangedTickers();
    });
  }

  /**
   * Repaint ticker row(s) and refresh the watchlist summary.
   * Delegates entirely to the watchlist manager which couples both operations.
   */
  private async repaintTickers(tickers: string[]): Promise<void> {
    await this.watchlistManager.refreshTickers(tickers);
  }

  /** @inheritdoc */
  public markCategorySelectedTickers(categoryId: WatchCategoryId): void {
    const type = this.domManager.isScreenerVisible() ? TickerArea.SCREENER : TickerArea.WATCHLIST;
    const selectedTickers = [...this.domManager.getTickers(type, TickerVisibility.SELECTED)];
    void this.categoryManager.recordWatchCategory(categoryId, selectedTickers);
  }

  /** @inheritdoc */
  public toggleReadyCurrentTicker(): void {
    const ticker = this.domManager.getTicker();
    void this.categoryManager.toggleReadyState(ticker);
  }
}
