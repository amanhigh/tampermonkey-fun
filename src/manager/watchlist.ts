import { Constants } from '../models/constant';
import { IPaintManager } from './paint';
import { IUIUtil } from '../util/ui';
import { IFnoRepo } from '../repo/fno';
import { IWatchManager } from './watch';
import { IFlagManager } from './flag';

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
 * Interface for managing TradingView watchlist operations
 */
export interface ITradingViewWatchlistManager {
  /**
   * Retrieves watchlist tickers
   * @param visible - If true, only returns visible tickers
   * @returns Array of watchlist tickers
   */
  getTickers(visible?: boolean): string[];

  /**
   * Get selected tickers from watchlist
   * @returns Array of selected ticker symbols
   */
  getSelectedTickers(): string[];

  /**
   * Paints the TradingView watchlist
   */
  paintWatchList(): void;

  /**
   * Applies default filters to the watchlist
   */
  applyDefaultFilters(): void;
}

/**
 * Manages TradingView watchlist operations
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
    private readonly uiUtil: IUIUtil,
    private readonly fnoRepo: IFnoRepo,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager
  ) {}

  /** @inheritdoc */
  getTickers(visible = false): string[] {
    const selector = Constants.DOM.WATCHLIST.SYMBOL;
    return this.tickerListHelper(selector, visible);
  }

  /** @inheritdoc */
  getSelectedTickers(): string[] {
    const watchlist = Constants.DOM.WATCHLIST;
    return $(`${watchlist.SELECTED} ${watchlist.SYMBOL}:visible`)
      .toArray()
      .map((s) => s.textContent || s.innerHTML);
  }

  /**
   * Helper function for retrieving ticker lists
   * @private
   * @param selector - The CSS selector for finding elements
   * @param visible - Whether to only get visible elements
   * @returns Array of ticker strings
   */
  private tickerListHelper(selector: string, visible: boolean): string[] {
    const finalSelector = visible ? selector + ':visible' : selector;
    const elements = $(finalSelector);

    // Use textContent instead of innerHTML to avoid HTML entity encoding issues (M&amp;M → M&M)
    return elements.toArray().map((s) => s.textContent || s.innerHTML);
  }

  /** @inheritdoc */
  paintWatchList(): void {
    this.resetWatchList();

    // TASK Optimize Further only on Ticker Movement ?
    this.watchManager.computeDefaultList(this.getTickers());

    // Paint Symbols
    const colorList = Constants.UI.COLORS.LIST;
    for (let i = 0; i < colorList.length; i++) {
      const color = colorList[i];
      const symbols = this.watchManager.getCategory(i);
      this.paintManager.paintSymbols(Constants.DOM.WATCHLIST.SYMBOL, symbols, { color: color });
    }

    // Paint Flags
    this.flagManager.paint(Constants.DOM.WATCHLIST.SYMBOL, Constants.DOM.WATCHLIST.ITEM);

    // Ticker Set Summary Update
    this.displaySetSummary();

    // Mark FNO
    this.paintManager.paintSymbols(Constants.DOM.WATCHLIST.SYMBOL, this.fnoRepo.getAll(), Constants.UI.COLORS.FNO_CSS);

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

    //Reset Color
    this.paintManager.resetColors(Constants.DOM.WATCHLIST.SYMBOL);
  }

  /**
   * Displays the ticker set summary in the UI
   * @private
   */
  private displaySetSummary(): void {
    const $watchSummary = $(`#${Constants.UI.IDS.AREAS.SUMMARY}`);
    $watchSummary.empty();

    for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
      const count = this.watchManager.getCategory(i)?.size || 0;
      const color = Constants.UI.COLORS.LIST[i];

      const $label = this.uiUtil
        .buildLabel(count.toString() + '|', color)
        .data('color', color)
        .appendTo($watchSummary);

      $label
        .mousedown((e: JQuery.MouseDownEvent) => {
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

  /** @inheritdoc */
  addFilter(filter: WatchlistFilter): void {
    if (!filter.ctrl && !filter.shift) {
      // Reset chain if no modifier keys
      this.filterChain = [filter];
    } else {
      // Add to existing chain
      this.filterChain.push(filter);
    }
    this.applyFilters();
  }

  /** @inheritdoc */
  applyFilters(): void {
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
    const symbolSelector = `${Constants.DOM.WATCHLIST.SYMBOL}[style*='color: ${color}']`;
    const screenerSymbolSelector = `${Constants.DOM.SCREENER.SYMBOL}[style*='color: ${color}']`;

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
   * @param filter - The filter parameters
   */
  private handleFilterInit(filter: WatchlistFilter): void {
    if (!filter.ctrl && !filter.shift) {
      this.hideAllItems();
    }
  }

  /**
   * Handles symbol-based filtering (left-click)
   * @private
   * @param filter - The filter parameters
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
   * @param filter - The filter parameters
   */
  private handleFlagFilter(filter: WatchlistFilter): void {
    this.filterByFlag(filter.color, filter.shift);
  }

  /**
   * Filters the watchlist symbols based on the provided filter parameters
   * @private
   * @param filter - The filter parameters
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
