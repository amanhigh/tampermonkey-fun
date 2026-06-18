/**
 * Interface and implementation for handling watchlist-related events and updates
 */

import { ICategoryManager } from '../manager/category';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { IPaintManager } from '../manager/paint';
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
   * Handles watchlist change events.
   * When MutationRecord[] is provided, attempts a targeted refresh
   * for single-row DOM changes, falling back to full refresh otherwise.
   * @param mutations - Optional mutation records from the DOM observer
   */
  onWatchListChange(mutations?: MutationRecord[]): void;

  /**
   * Records the selected ticker for a given watch category.
   * @param categoryId The category identifier to record into.
   */
  recordSelectedTicker(categoryId: WatchCategoryId): void;

  /**
   * Toggle READY state for the current chart ticker.
   * Uses the backend category to decide state, not the DOM ticker colour.
   * If current ticker is READY, clear it to WATCHED; otherwise mark READY.
   */
  toggleReadyForSelectedTickers(): void;
}

/**
 * Handles all watchlist-related events and updates
 */
export class WatchListHandler implements IWatchListHandler {
  constructor(
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly paintManager: IPaintManager,
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
  public onWatchListChange(mutations?: MutationRecord[]): void {
    // Attempt targeted refresh when we have exactly one confident ticker change
    if (mutations && mutations.length > 0) {
      const tickers = this.extractChangedTickers(mutations);
      if (tickers.length === 1) {
        void this.watchlistManager.refreshTickers(tickers);
        return;
      }
    }
    // Fall back to full refresh for no mutations, ambiguous, or bulk changes
    this.syncUtil.waitOn('watchListChangeEvent', 20, () => {
      void this.watchlistManager.refresh();
    });
  }

  /**
   * Extract unique ticker symbols from a batch of mutation records
   * by looking for elements matching the watchlist symbol selector
   * in both added and removed nodes.
   */
  private extractChangedTickers(mutations: MutationRecord[]): string[] {
    const tickers = new Set<string>();

    for (const mutation of mutations) {
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      for (const node of nodes) {
        if (!(node instanceof Element)) {
          continue;
        }
        // Search for symbol elements within the added/removed subtree
        $(node)
          .find(Constants.DOM.WATCHLIST.SYMBOL)
          .each((_: number, el: Element) => {
            const text = (el.textContent || '').trim();
            if (text.length > 0) {
              tickers.add(text);
            }
          });
        // If the node itself is a symbol element
        if ($(node).is(Constants.DOM.WATCHLIST.SYMBOL)) {
          const text = (node.textContent || '').trim();
          if (text.length > 0) {
            tickers.add(text);
          }
        }
      }
    }

    return [...tickers];
  }

  /**
   * Repaint ticker row(s) and refresh the watchlist summary.
   * Unified entry point so both operations are never accidentally missed.
   */
  private async repaintTickers(tickers: string[]): Promise<void> {
    await this.paintManager.paintTickers(tickers);
    await this.watchlistManager.refreshSummary();
  }

  /** @inheritdoc */
  public recordSelectedTicker(categoryId: WatchCategoryId): void {
    const type = this.domManager.isScreenerVisible() ? TickerArea.SCREENER : TickerArea.WATCHLIST;
    const selectedTickers = [...this.domManager.getTickers(type, TickerVisibility.SELECTED)];
    void this.categoryManager.recordWatchCategory(categoryId, selectedTickers);
  }

  /** @inheritdoc */
  public toggleReadyForSelectedTickers(): void {
    const ticker = this.domManager.getTicker();
    void this.categoryManager.toggleReadyState([ticker]);
  }
}
