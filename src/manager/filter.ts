import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { IUIUtil } from '../util/ui';
import { ALL_WATCH_CATEGORIES, BucketSummary } from '../models/watch';

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
 * Interface for managing watchlist summary label rendering and filter-chain
 * UI behavior. All DOM reset, label drawing, and color/flag filter application
 * are scoped here. Pure UI — no ticker state, persistence, or domain events.
 */
export interface IFilterManager {
  /**
   * Reset watchlist layout and visibility. Does NOT reset visual decals
   * (colors, flags, F&O borders) — those are handled by PaintManager.paint().
   */
  resetWatchList(): void;

  /**
   * Re-render summary labels and re-apply active filters.
   * @param result - Bucket summary counts from PaintManager.
   */
  refreshSummary(result: BucketSummary): void;
}

/**
 * Manages watchlist summary label rendering and filter-chain UI behavior.
 * All DOM reset, label drawing, and color/flag filter application live here.
 * Pure UI — no ticker state, persistence, or domain events.
 */
export class FilterManager implements IFilterManager {
  /** Filter chain for watchlist operations */
  private filterChain: WatchlistFilter[] = [];

  constructor(private readonly uiUtil: IUIUtil) {
    // Initialise default white filter
    this.addFilter({
      color: Constants.UI.COLORS.DEFAULT,
      index: LEFT_CLICK,
      ctrl: false,
      shift: false,
    });
  }

  /** @inheritdoc */
  resetWatchList(): void {
    // Increase Widget Height to prevent Line Filtering
    $(Constants.DOM.WATCHLIST.WIDGET).css('height', '20000px');

    // Show All Items
    $(Constants.DOM.WATCHLIST.LINE).show();
    $(Constants.DOM.SCREENER.LINE).show();

    // Disable List Transformation
    $(Constants.DOM.WATCHLIST.LINE).css('position', '');
    $(Constants.DOM.WATCHLIST.CONTAINER).css('overflow', '');
  }

  /** @inheritdoc */
  refreshSummary(result: BucketSummary): void {
    this.displaySetSummary(result);
    this.applyFilters();
  }

  /**
   * Build a WatchlistFilter from a jQuery mouse-down event.
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
   * Display the ticker set summary in the UI.
   * @param result - Bucket summary counts from paint
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
   */
  private applyFilters(): void {
    this.resetWatchList();
    this.filterChain.forEach((f) => this.filterWatchList(f));
  }

  /**
   * Helper method to hide all watchlist and screener items
   */
  private hideAllItems(): void {
    $(Constants.DOM.WATCHLIST.LINE).hide();
    $(Constants.DOM.SCREENER.LINE).hide();
  }

  /**
   * Applies color-based filtering to watchlist and screener
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
   */
  private handleResetFilter(): void {
    this.resetWatchList();
    this.filterChain = [];
  }

  /**
   * Filters the watchlist symbols based on the provided filter parameters
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
}
