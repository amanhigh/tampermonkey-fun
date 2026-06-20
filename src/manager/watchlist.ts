import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { IPaintManager } from './paint';
import { ICategoryManager } from './category';
import { IUIUtil } from '../util/ui';
import { IPublisher } from './event_bus';
import { IDomManager } from './dom';
import { ALL_WATCH_CATEGORIES, BucketSummary } from '../models/watch';
import { DomainEventType } from '../models/domain_event';

/** Mouse button codes for filtering */
const LEFT_CLICK = 1;
const MIDDLE_CLICK = 2;
const RIGHT_CLICK = 3;

/**
 * Filter options for watchlist manipulation
 */
interface WatchlistFilter {
  color: string;
  index: number;
  ctrl: boolean;
  shift: boolean;
}

/**
 * Interface for managing TradingView watchlist operations.
 * Ticker retrieval and painting are delegated to DomManager and PaintManager.
 * This interface only handles watchlist-specific UI/filter behaviour.
 */
export interface ITradingViewWatchlistManager {
  /**
   * Refreshes watchlist UI: layout reset, ticker paint, summary labels, filters.
   */
  refresh(): Promise<void>;

  /**
   * Targeted refresh for specific tickers that need repainting (category change,
   * timeframe change, metadata change, etc). Always repaints tickers AND
   * refreshes summary/filters together.
   * @param tickers - Ticker symbols to repaint
   */
  refreshTickers(tickers: string[]): Promise<void>;

  /**
   * Targeted refresh driven by observed DOM change.
   * Computes the actual added/removed tickers from the previous snapshot
   * vs current DOM. For a single ticker change, performs a targeted
   * refresh (paintTickers). For zero or multiple changes, falls back
   * to full refresh().
   */
  refreshChangedTickers(): Promise<void>;
}

/**
 * Manages TradingView watchlist layout, summary labels, and filters.
 * @class TradingViewWatchlistManager
 */
export class TradingViewWatchlistManager implements ITradingViewWatchlistManager {
  /**
   * Filter chain for watchlist operations
   * @private
   */
  private filterChain: WatchlistFilter[] = [];

  /**
   * Snapshot of the watchlist ticker set from the previous refresh cycle.
   * Used to detect tickers removed from the DOM watchlist.
   * null on first call (skip removal detection for baseline).
   * @private
   */
  private prevWatchlistTickers: Set<string> | null = null;

  constructor(
    private readonly paintManager: IPaintManager,
    private readonly categoryManager: ICategoryManager,
    private readonly uiUtil: IUIUtil,
    private readonly domManager: IDomManager,
    private readonly publisher: IPublisher
  ) {
    // Initialise default white filter
    this.addFilter({
      color: Constants.UI.COLORS.DEFAULT,
      index: LEFT_CLICK,
      ctrl: false,
      shift: false,
    });
  }

  /** @inheritdoc */
  async refresh(): Promise<void> {
    this.resetWatchList();

    // Detect tickers added or removed from DOM watchlist (skip on first baseline call)
    const currentTickers = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);

    // Persist current watchlist to shared silo so cross-page consumers (e.g. DisplayManager
    // on the Investing alert feed page) can read ticker membership without TradingView DOM.
    await this.saveWatchlistSilo(currentTickers);

    let changedTickers: string[] = [];
    if (this.prevWatchlistTickers !== null) {
      const removedTickers = [...this.prevWatchlistTickers].filter((t) => !currentTickers.has(t));
      const addedTickers = [...currentTickers].filter((t) => !this.prevWatchlistTickers!.has(t));
      changedTickers = [...removedTickers, ...addedTickers];
      if (removedTickers.length > 0) {
        await this.categoryManager.clearReadyState(removedTickers);
      }
    }
    this.prevWatchlistTickers = currentTickers;

    // Delegate all ticker painting (symbols, flags, FNO) to PaintManager
    await this.paintManager.paint();

    // Reuse summary + filter refresh
    await this.refreshSummary();

    // Notify subscribers of ticker set changes only when changes exist
    if (changedTickers.length > 0) {
      void this.publisher.publish({
        type: DomainEventType.WATCHLIST_CHANGED,
        tickers: changedTickers,
      });
    }
  }

  /** @inheritdoc */
  async refreshChangedTickers(): Promise<void> {
    // Fall back to full refresh if baseline has not been established
    if (this.prevWatchlistTickers === null) {
      await this.refresh();
      return;
    }

    const currentTickers = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);
    await this.saveWatchlistSilo(currentTickers);

    const prevTickers = this.prevWatchlistTickers!;
    const removedTickers = [...prevTickers].filter((t) => !currentTickers.has(t));
    const addedTickers = [...currentTickers].filter((t) => !prevTickers.has(t));
    const changedTickers = [...removedTickers, ...addedTickers];

    if (changedTickers.length === 0) {
      // No membership change — just update snapshot
      this.prevWatchlistTickers = currentTickers;
      return;
    }

    this.prevWatchlistTickers = currentTickers;

    if (changedTickers.length === 1) {
      // Targeted refresh for a single confirmed change
      if (removedTickers.length > 0) {
        await this.categoryManager.clearReadyState(removedTickers);
      }

      await this.paintManager.paintTickers(changedTickers);
      await this.refreshSummary();

      void this.publisher.publish({
        type: DomainEventType.WATCHLIST_CHANGED,
        tickers: changedTickers,
      });
      return;
    }

    // Multiple changes — fall back to full refresh
    await this.paintManager.paint();
    await this.refreshSummary();

    void this.publisher.publish({
      type: DomainEventType.WATCHLIST_CHANGED,
      tickers: changedTickers,
    });
  }

  /** @inheritdoc */
  async refreshTickers(tickers: string[]): Promise<void> {
    if (tickers.length === 0) {
      return;
    }

    await this.paintManager.paintTickers(tickers);
    await this.refreshSummary();
  }

  /**
   * Recompute bucket counts and refresh summary labels + filters.
   * Internal — callers should use refreshTickers() or rely on refresh()
   * / refreshChangedTickers() to call this automatically.
   */
  private async refreshSummary(): Promise<void> {
    // Recompute bucket counts without repainting DOM
    const result = await this.paintManager.summarizeBuckets();

    // Update summary labels
    this.displaySetSummary(result);

    // Re-apply active filters
    this.applyFilters();
  }

  /**
   * Reset watchlist layout and visibility. Does NOT reset visual decals
   * (colors, flags, F&O borders) — those are handled by PaintManager.paint().
   */
  private resetWatchList(): void {
    // Increase Widget Height to prevent Line Filtering
    $(Constants.DOM.WATCHLIST.WIDGET).css('height', '20000px');

    // Show All Items
    $(Constants.DOM.WATCHLIST.LINE).show();
    $(Constants.DOM.SCREENER.LINE).show();

    // Disable List Transformation
    $(Constants.DOM.WATCHLIST.LINE).css('position', '');
    $(Constants.DOM.WATCHLIST.CONTAINER).css('overflow', '');
  }

  /**
   * Build a WatchlistFilter from a jQuery mouse-down event.
   * @private
   */
  private createFilterFromMouseEvent(e: JQuery.MouseDownEvent): WatchlistFilter {
    return {
      color: $(e.target).data('color') as string,
      index: e.which,
      ctrl: e.originalEvent?.ctrlKey || false,
      shift: e.originalEvent?.shiftKey || false,
    };
  }

  /**
   * Displays the ticker set summary in the UI
   * @private
   * @param result Bucket summary counts from paint
   */
  private displaySetSummary(result: BucketSummary): void {
    const $watchSummary = $(`#${Constants.UI.IDS.AREAS.SUMMARY}`);
    $watchSummary.empty();

    const uncategorizedCount = result.uncategorizedCount;

    for (const cat of ALL_WATCH_CATEGORIES) {
      const count = result.buckets.get(cat.id) ?? 0;
      const displayCount = cat.id === 'DEFAULT_DAILY' ? count + uncategorizedCount : count;
      const color = cat.color;

      const $label = this.uiUtil
        .buildLabel(displayCount.toString() + '|', color)
        .data('color', color)
        .appendTo($watchSummary);

      $label
        .mousedown((e: JQuery.MouseDownEvent) => {
          this.addFilter(this.createFilterFromMouseEvent(e));
        })
        .contextmenu((e) => {
          e.preventDefault();
          e.stopPropagation();
        });
    }
  }

  /**
   * Add a filter to the current filter chain.
   * @private
   */
  private addFilter(filter: WatchlistFilter): void {
    if (!filter.ctrl && !filter.shift) {
      // Reset chain if no modifier keys
      this.filterChain = [filter];
    } else {
      // Add to existing chain
      this.filterChain.push(filter);
    }
    this.applyFilters();
  }

  /**
   * Apply all filters in the current chain.
   * @private
   */
  private applyFilters(): void {
    this.resetWatchList();
    this.filterChain.forEach((filter) => this.filterWatchList(filter));
  }

  /**
   * Helper method to hide all watchlist and screener items
   * @private
   */
  private hideAllItems(): void {
    $(Constants.DOM.WATCHLIST.LINE).hide();
    $(Constants.DOM.SCREENER.LINE).hide();
  }

  /**
   * Applies color-based filtering to watchlist and screener
   * @private
   * @param color - Target color for filtering
   * @param shift - If true, hide matching elements instead of showing them
   */
  private filterByColor(color: string, shift: boolean): void {
    const symbolSelector = `${TickerArea.WATCHLIST.getSymbolSelector(TickerVisibility.ALL)}[style*='color: ${color}']`;
    const screenerSymbolSelector = `${TickerArea.SCREENER.getSymbolSelector(TickerVisibility.ALL)}[style*='color: ${color}']`;

    if (shift) {
      $(Constants.DOM.WATCHLIST.LINE).not(`:has(${symbolSelector})`).hide();
      $(Constants.DOM.SCREENER.LINE).not(`:has(${screenerSymbolSelector})`).hide();
    } else {
      $(Constants.DOM.WATCHLIST.LINE + `:hidden`)
        .has(symbolSelector)
        .show();
      $(Constants.DOM.SCREENER.LINE + `:hidden`)
        .has(screenerSymbolSelector)
        .show();
    }
  }

  /**
   * Applies flag-based filtering to watchlist and screener
   * @private
   * @param color - Target flag color for filtering
   * @param shift - If true, hide matching elements instead of showing them
   */
  private filterByFlag(color: string, shift: boolean): void {
    const flagSelector = `${Constants.DOM.FLAGS.SYMBOL}[style*='color: ${color}']`;

    if (shift) {
      $(Constants.DOM.WATCHLIST.LINE).has(flagSelector).hide();
      $(Constants.DOM.SCREENER.LINE).has(flagSelector).hide();
    } else {
      $(Constants.DOM.WATCHLIST.LINE + `:hidden`)
        .has(flagSelector)
        .show();
      $(Constants.DOM.SCREENER.LINE + `:hidden`)
        .has(flagSelector)
        .show();
    }
  }

  /**
   * Handles filter reset (middle-click)
   * @private
   */
  private handleResetFilter(): void {
    this.resetWatchList();
    this.filterChain = [];
  }

  /**
   * Filters the watchlist symbols based on the provided filter parameters
   * @private
   */
  private filterWatchList(filter: WatchlistFilter): void {
    // On a new filter chain (non-modifier click), hide all items first
    if (!filter.ctrl && !filter.shift) {
      this.hideAllItems();
    }

    switch (filter.index) {
      case LEFT_CLICK:
        this.filterByColor(filter.color, filter.shift);
        break;
      case MIDDLE_CLICK:
        this.handleResetFilter();
        break;
      case RIGHT_CLICK:
        this.filterByFlag(filter.color, filter.shift);
        break;
      default:
        throw new Error('You have a strange Mouse!');
    }
  }

  /**
   * Persist current watchlist ticker set to shared GM silo so cross-page
   * consumers (e.g. DisplayManager on the Investing alert feed page) can
   * read ticker membership without relying on TradingView DOM presence.
   */
  private async saveWatchlistSilo(tickers: Set<string>): Promise<void> {
    await GM.setValue(
      Constants.STORAGE.SILOS.WATCHLIST,
      JSON.stringify({
        tickers: [...tickers],
        updatedAt: new Date().toISOString(),
      })
    );
  }
}
