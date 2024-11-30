import { Constants } from '../models/constant';
import { IPaintManager } from './paint';
import { IWatchlistRepo } from '../repo/watch';
import { IRecentTickerRepo } from '../repo/recent';
import { IUIUtil } from '../util/ui';
import { WatchChangeEvent } from '../models/events';
import { Notifier } from '../util/notify';
import { IFnoRepo } from '../repo/fno';

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
   * Remove all watchlist filters
   */
  resetWatchList(): void;

  /**
   * Creates and stores the WatchChangeEvent for the alert feed
   */
  paintAlertFeedEvent(): Promise<void>;

  /**
   * Adds a new filter to the filter chain
   * @param filter - The filter to add
   */
  addFilter(filter: WatchlistFilter): void;

  /**
   * Applies all active filters in the filter chain
   */
  applyFilters(): void;
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
  private _filterChain: WatchlistFilter[] = [];

  /**
   * @param paintManager - Instance of PaintManager
   * @param watchRepo - Instance of WatchlistRepo
   * @param recentTickerRepo - Instance of RecentTickerRepo
   * @param uiUtil - Instance of UIUtil for building UI components
   * @param fnoRepo - Instance of FnoRepo for FNO symbols
   */
  constructor(
    private readonly paintManager: IPaintManager,
    private readonly watchRepo: IWatchlistRepo,
    private readonly recentTickerRepo: IRecentTickerRepo,
    private readonly uiUtil: IUIUtil,
    private readonly fnoRepo: IFnoRepo
  ) {}

  /** @inheritdoc */
  getTickers(visible = false): string[] {
    const selector = Constants.DOM.WATCHLIST.SYMBOL;
    return this._tickerListHelper(selector, visible);
  }

  /** @inheritdoc */
  getSelectedTickers(): string[] {
    const watchlist = Constants.DOM.WATCHLIST;
    return $(`${watchlist.SELECTED} ${watchlist.SYMBOL}:visible`)
      .toArray()
      .map((s) => s.innerHTML);
  }

  /**
   * Helper function for retrieving ticker lists
   * @private
   * @param selector - The CSS selector for finding elements
   * @param visible - Whether to only get visible elements
   * @returns Array of ticker strings
   */
  private _tickerListHelper(selector: string, visible: boolean): string[] {
    return $(visible ? selector + ':visible' : selector)
      .toArray()
      .map((s) => s.innerHTML);
  }

  /** @inheritdoc */
  paintWatchList(): void {
    //Reset Color
    this.paintManager.resetColors(Constants.DOM.WATCHLIST.SYMBOL);

    // Paint Name and Flags
    this.paintManager.paintTickers(Constants.DOM.WATCHLIST.SYMBOL);

    // Ticker Set Summary Update
    this._displaySetSummary();

    // Mark FNO
    this.paintManager.applyCss(Constants.DOM.WATCHLIST.SYMBOL, this.fnoRepo.getAll(), Constants.UI.COLORS.FNO_CSS);
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

  /**
   * Displays the ticker set summary in the UI
   * @private
   */
  private _displaySetSummary(): void {
    const $watchSummary = $(`#${Constants.UI.IDS.AREAS.SUMMARY}`);
    $watchSummary.empty();

    const orderCategoryLists = this.watchRepo.getWatchCategoryLists();

    for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
      const count = orderCategoryLists.getList(i)?.size || -1;
      const color = Constants.UI.COLORS.LIST[i];

      const $label = this.uiUtil
        .buildLabel(count.toString() + '|', color)
        .data('color', color)
        .appendTo($watchSummary);

      $label
        .mousedown((e: JQuery.MouseDownEvent) => {
          this.addFilter({
            color: $(e.target).data('color'),
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
  async paintAlertFeedEvent(): Promise<void> {
    const watchList = this.getTickers();
    const recentList = Array.from(this.recentTickerRepo.getAll());
    const event = new WatchChangeEvent(watchList, recentList);
    await this.watchRepo.createWatchChangeEvent(event);
  }

  /** @inheritdoc */
  addFilter(filter: WatchlistFilter): void {
    if (!filter.ctrl && !filter.shift) {
      // Reset chain if no modifier keys
      this._filterChain = [filter];
    } else {
      // Add to existing chain
      this._filterChain.push(filter);
    }
    this.applyFilters();
  }

  /** @inheritdoc */
  applyFilters(): void {
    this._filterChain.forEach((filter) => this._filterWatchList(filter));
  }

  /**
   * Helper method to hide all watchlist and screener items
   * @private
   */
  private _hideAllItems(): void {
    $(Constants.DOM.WATCHLIST.LINE).hide();
    $(Constants.DOM.SCREENER.LINE).hide();
  }

  /**
   * Applies color-based filtering to watchlist and screener
   * @private
   * @param color - Target color for filtering
   * @param shift - If true, hide matching elements instead of showing them
   */
  private _filterByColor(color: string, shift: boolean): void {
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
  private _filterByFlag(color: string, shift: boolean): void {
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
  private _handleFilterInit(filter: WatchlistFilter): void {
    if (!filter.ctrl && !filter.shift) {
      this._hideAllItems();
    }
  }

  /**
   * Handles symbol-based filtering (left-click)
   * @private
   * @param filter - The filter parameters
   */
  private _handleSymbolFilter(filter: WatchlistFilter): void {
    this._filterByColor(filter.color, filter.shift);
  }

  /**
   * Handles filter reset (middle-click)
   * @private
   */
  private _handleResetFilter(): void {
    this.resetWatchList();
    this._filterChain = [];
  }

  /**
   * Handles flag-based filtering (right-click)
   * @private
   * @param filter - The filter parameters
   */
  private _handleFlagFilter(filter: WatchlistFilter): void {
    this._filterByFlag(filter.color, filter.shift);
  }

  /**
   * Filters the watchlist symbols based on the provided filter parameters
   * @private
   * @param filter - The filter parameters
   */
  private _filterWatchList(filter: WatchlistFilter): void {
    this._handleFilterInit(filter);

    switch (filter.index) {
      case 1: // Left Click
        this._handleSymbolFilter(filter);
        break;
      case 2: // Middle Click
        this._handleResetFilter();
        break;
      case 3: // Right Click
        this._handleFlagFilter(filter);
        break;
      default:
        Notifier.error('You have a strange Mouse!');
    }
  }
}
