import { Constants } from '../models/constant';
import { IPaintManager } from './paint';
import { IOrderRepo } from '../repo/order';
import { IRecentTickerRepo } from '../repo/recent';
import { IUIUtil } from '../util/ui';
import { WatchChangeEvent } from '../models/events';

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
    paintAlertFeedEvent(): void;

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
     * @param orderRepo - Instance of OrderRepo
     * @param recentTickerRepo - Instance of RecentTickerRepo
     * @param uiUtil - Instance of UIUtil for building UI components
     */
    constructor(
        private readonly paintManager: IPaintManager,
        private readonly orderRepo: IOrderRepo,
        private readonly recentTickerRepo: IRecentTickerRepo,
        private readonly uiUtil: IUIUtil
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
            .map(s => s.innerHTML);
    }

    /**
     * Helper function for retrieving ticker lists
     * @private
     * @param selector - The CSS selector for finding elements
     * @param visible - Whether to only get visible elements
     * @returns Array of ticker strings
     */
    private _tickerListHelper(selector: string, visible: boolean): string[] {
        return $(visible ? selector + ":visible" : selector)
            .toArray()
            .map(s => s.innerHTML);
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
        this.paintManager.applyCss(
            Constants.DOM.WATCHLIST.SYMBOL,
            Constants.EXCHANGE.FNO_SYMBOLS,
            Constants.UI.COLORS.FNO_CSS
        );
    }

    /** @inheritdoc */
    resetWatchList(): void {
        // Increase Widget Height to prevent Line Filtering
        $(Constants.DOM.WATCHLIST.WIDGET).css('height', '20000px');

        // Show All Items
        $(Constants.DOM.WATCHLIST.LINE_SELECTOR).show();
        $(Constants.DOM.SCREENER.LINE_SELECTOR).show();

        // Disable List Transformation
        $(Constants.DOM.WATCHLIST.LINE_SELECTOR).css('position', '');
        $(Constants.DOM.WATCHLIST.CONTAINER).css('overflow', '');
    }

    /**
     * Displays the ticker set summary in the UI
     * @private
     */
    private _displaySetSummary(): void {
        const $watchSummary = $(`#${Constants.UI.IDS.AREAS.SUMMARY}`);
        $watchSummary.empty();

        const orderCategoryLists = this.orderRepo.getOrderCategoryLists();

        for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
            const count = orderCategoryLists.get(i).size;
            const color = Constants.UI.COLORS.LIST[i];

            const $label = this.uiUtil.buildLabel(count.toString() + '|', color)
                .data('color', color)
                .appendTo($watchSummary);

            $label.mousedown((e: JQuery.MouseDownEvent) => {
                this.addFilter({
                    color: $(e.target).data('color'),
                    index: e.which,
                    ctrl: e.originalEvent?.ctrlKey || false,
                    shift: e.originalEvent?.shiftKey || false
                });
            }).contextmenu(e => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
    }

    /** @inheritdoc */
    paintAlertFeedEvent(): void {
        const watchList = this.getTickers();
        const recentList = Array.from(this.recentTickerRepo.getAll());
        const event = new WatchChangeEvent(watchList, recentList);
        // HACK: Move to event repository
        GM_setValue(Constants.STORAGE.EVENTS.TV_WATCH_CHANGE, event);
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
        this._filterChain.forEach(filter => this._filterWatchList(filter));
    }

    /**
     * Filters the watchlist symbols based on the provided filter parameters
     * @private
     * @param filter - The filter parameters
     */
    private _filterWatchList(filter: WatchlistFilter): void {
        // HACK: Breakdown Function
        if (!filter.ctrl && !filter.shift) {
            // Hide Everything
            $(Constants.DOM.WATCHLIST.LINE_SELECTOR).hide();
            $(Constants.DOM.SCREENER.LINE_SELECTOR).hide();
        }

        switch (filter.index) {
            case 1:
                if (filter.shift) {
                    $(Constants.DOM.WATCHLIST.LINE_SELECTOR)
                        .not(`:has(${Constants.DOM.WATCHLIST.SYMBOL}[style*='color: ${filter.color}'])`)
                        .hide();
                    $(Constants.DOM.SCREENER.LINE_SELECTOR)
                        .not(`:has(${Constants.DOM.SCREENER.SYMBOL}[style*='color: ${filter.color}'])`)
                        .hide();
                } else {
                    $(Constants.DOM.WATCHLIST.LINE_SELECTOR + `:hidden`)
                        .has(`${Constants.DOM.WATCHLIST.SYMBOL}[style*='color: ${filter.color}']`)
                        .show();
                    $(Constants.DOM.SCREENER.LINE_SELECTOR + `:hidden`)
                        .has(`${Constants.DOM.SCREENER.SYMBOL}[style*='color: ${filter.color}']`)
                        .show();
                }
                break;
            case 2:
                // Middle Mouse:
                this.resetWatchList();
                // Reset Filter
                this._filterChain = [];
                break;
            case 3:
                if (filter.shift) {
                    $(Constants.DOM.WATCHLIST.LINE_SELECTOR)
                        .has(`${Constants.DOM.FLAGS.SYMBOL}[style*='color: ${filter.color}']`)
                        .hide();
                    $(Constants.DOM.SCREENER.LINE_SELECTOR)
                        .has(`${Constants.DOM.FLAGS.SYMBOL}[style*='color: ${filter.color}']`)
                        .hide();
                } else {
                    $(Constants.DOM.WATCHLIST.LINE_SELECTOR + `:hidden`)
                        .has(`${Constants.DOM.FLAGS.SYMBOL}[style*='color: ${filter.color}']`)
                        .show();
                    $(Constants.DOM.SCREENER.LINE_SELECTOR + `:hidden`)
                        .has(`${Constants.DOM.FLAGS.SYMBOL}[style*='color: ${filter.color}']`)
                        .show();
                }
                break;
            default:
                message('You have a strange Mouse!', 'red');
        }
    }
}
