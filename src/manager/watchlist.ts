import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { IPaintManager } from './paint';
import { IUIUtil } from '../util/ui';
import { ALL_WATCH_CATEGORIES, CategoryBuckets } from '../models/watch';

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
  paintWatchList(): Promise<void>;

  /**
   * Applies default filters to the watchlist.
   */
  applyDefaultFilters(): void;
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

  constructor(
    private readonly paintManager: IPaintManager,
    private readonly uiUtil: IUIUtil
  ) {}

  /** @inheritdoc */
  async paintWatchList(): Promise<void> {
    this.resetWatchList();

    // Delegate all ticker painting (symbols, flags, FNO) to PaintManager
    const result = await this.paintManager.paintArea(TickerArea.WATCHLIST);

    // Ticker Set Summary Update
    this.displaySetSummary(result);

    // Apply Filters
    this.applyFilters();
  }

  /** @inheritdoc */
  applyDefaultFilters(): void {
    // Apply white filter by default
    this.addFilter({
      color: Constants.UI.COLORS.DEFAULT,
      index: 1, // Left click
      ctrl: false,
      shift: false,
    });
  }

  private resetWatchList(): void {
    // Increase Widget Height to prevent Line Filtering
    $(Constants.DOM.WATCHLIST.WIDGET).css('height', '20000px');

    // Show All Items
    $(Constants.DOM.WATCHLIST.LINE).show();
    $(Constants.DOM.SCREENER.LINE).show();

    // Disable List Transformation
    $(Constants.DOM.WATCHLIST.LINE).css('position', '');
    $(Constants.DOM.WATCHLIST.CONTAINER).css('overflow', '');

    // Reset area visual state (symbols, flags, F&O borders)
    this.paintManager.resetArea(TickerArea.WATCHLIST);
  }

  /**
   * Displays the ticker set summary in the UI
   * @private
   * @param result Category bucket results from classification
   */
  private displaySetSummary(result: CategoryBuckets): void {
    const $watchSummary = $(`#${Constants.UI.IDS.AREAS.SUMMARY}`);
    $watchSummary.empty();

    const uncategorizedCount = result.uncategorized.size;

    for (const cat of ALL_WATCH_CATEGORIES) {
      const count = result.buckets.get(cat.id)?.size ?? 0;
      const displayCount = cat.id === 'DEFAULT_DAILY' ? count + uncategorizedCount : count;
      const color = cat.color;

      const $label = this.uiUtil
        .buildLabel(displayCount.toString() + '|', color)
        .data('color', color)
        .appendTo($watchSummary);

      $label
        .mousedown((e: JQuery.MouseDownEvent) => {
          // HACK: Handler Layer logic move from here.
          this.addFilter({
            color: $(e.target).data('color') as string,
            index: e.which,
            ctrl: e.originalEvent?.ctrlKey || false,
            shift: e.originalEvent?.shiftKey || false,
          });
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
   * Handles initial filter state setup
   * @private
   */
  private handleFilterInit(filter: WatchlistFilter): void {
    if (!filter.ctrl && !filter.shift) {
      this.hideAllItems();
    }
  }

  /**
   * Handles symbol-based filtering (left-click)
   * @private
   */
  private handleSymbolFilter(filter: WatchlistFilter): void {
    this.filterByColor(filter.color, filter.shift);
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
   * Handles flag-based filtering (right-click)
   * @private
   */
  private handleFlagFilter(filter: WatchlistFilter): void {
    this.filterByFlag(filter.color, filter.shift);
  }

  /**
   * Filters the watchlist symbols based on the provided filter parameters
   * @private
   */
  private filterWatchList(filter: WatchlistFilter): void {
    this.handleFilterInit(filter);

    switch (filter.index) {
      case 1: // Left Click
        this.handleSymbolFilter(filter);
        break;
      case 2: // Middle Click
        this.handleResetFilter();
        break;
      case 3: // Right Click
        this.handleFlagFilter(filter);
        break;
      default:
        throw new Error('You have a strange Mouse!');
    }
  }
}
