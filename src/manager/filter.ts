import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';

/** Mouse button codes for filtering */
const LEFT_CLICK = 1;
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
 * Interface for managing watchlist filter-chain UI behavior.
 * All DOM reset and color/flag filter application are scoped here.
 * Pure UI — no ticker state, persistence, or domain events.
 */
export interface IFilterManager {
  /**
   * Reset watchlist layout and visibility. Does NOT reset visual decals
   * (colors, flags, F&O borders) — those are handled by PaintManager.paint().
   */
  resetWatchList(): void;

  /**
   * Apply a color-based filter to the watchlist.
   * Without modifiers the chain is replaced; with ctrl/shift it is appended.
   * @param color - CSS color string to match against ticker symbols.
   * @param shift - When true the matching set is inverted (hide instead of show).
   * @param ctrl  - When true the filter is appended to the existing chain.
   */
  applyColorFilter(color: string, shift: boolean, ctrl: boolean): void;

  /**
   * Apply a flag-based filter to the watchlist.
   * Without modifiers the chain is replaced; with shift it is appended and
   * hides matching items.
   * @param color - CSS color string to match against ticker flags.
   * @param shift - When true the matching set is hidden.
   */
  applyFlagFilter(color: string, shift: boolean): void;

  /**
   * Reset the filter chain and restore full watchlist visibility.
   */
  resetFilters(): void;

  /**
   * Re-apply the current filter chain without modifying it.
   * Useful after a summary repaint.
   */
  reapplyFilters(): void;
}

/**
 * Manages watchlist filter-chain UI behavior.
 * All DOM reset and color/flag filter application live here.
 * Pure UI — no ticker state, persistence, or domain events.
 */
export class FilterManager implements IFilterManager {
  /** Filter chain for watchlist operations */
  private filterChain: WatchlistFilter[] = [];

  constructor() {
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
    $(TickerArea.WATCHLIST.mainSelector).css('height', '20000px');

    // Show All Items
    $(TickerArea.WATCHLIST.line).show();
    $(TickerArea.SCREENER.line).show();

    // Disable List Transformation
    $(TickerArea.WATCHLIST.line).css('position', '');
    $(TickerArea.WATCHLIST.containerSelector).css('overflow', '');
  }

  /** @inheritdoc */
  applyColorFilter(color: string, shift: boolean, ctrl: boolean): void {
    this.addFilter({ color, index: LEFT_CLICK, ctrl, shift });
  }

  /** @inheritdoc */
  applyFlagFilter(color: string, shift: boolean): void {
    this.addFilter({ color, index: RIGHT_CLICK, ctrl: false, shift });
  }

  /** @inheritdoc */
  resetFilters(): void {
    this.resetWatchList();
    this.filterChain = [];
  }

  /** @inheritdoc */
  reapplyFilters(): void {
    this.applyFilters();
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
    $(TickerArea.WATCHLIST.line).hide();
    $(TickerArea.SCREENER.line).hide();
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
      $(TickerArea.WATCHLIST.line).not(`:has(${symbolSelector})`).hide();
      $(TickerArea.SCREENER.line).not(`:has(${screenerSymbolSelector})`).hide();
    } else {
      $(TickerArea.WATCHLIST.line + `:hidden`)
        .has(symbolSelector)
        .show();
      $(TickerArea.SCREENER.line + `:hidden`)
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
    const flagSelector = `${TickerArea.WATCHLIST.getFlagSelector()}[style*='color: ${color}']`;

    if (shift) {
      $(TickerArea.WATCHLIST.line).has(flagSelector).hide();
      $(TickerArea.SCREENER.line).has(flagSelector).hide();
    } else {
      $(TickerArea.WATCHLIST.line + `:hidden`)
        .has(flagSelector)
        .show();
      $(TickerArea.SCREENER.line + `:hidden`)
        .has(flagSelector)
        .show();
    }
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
      case RIGHT_CLICK:
        this.filterByFlag(filter.color, filter.shift);
        break;
      default:
        throw new Error('You have a strange Mouse!');
    }
  }
}
