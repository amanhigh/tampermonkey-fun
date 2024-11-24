/**
 * Manages TradingView watchlist operations
 * @class TradingViewWatchlistManager
 */
class TradingViewWatchlistManager {
    /**
     * @param {PaintManager} paintManager - Instance of PaintManager
     * @param {OrderRepo} orderRepo - Instance of OrderRepo
     * @param {RecentTickerRepo} recentTickerRepo - Instance of RecentTickerRepo
     */
    constructor(paintManager, orderRepo, recentTickerRepo) {
        this.paintManager = paintManager;
        this.orderRepo = orderRepo;
        this.recentTickerRepo = recentTickerRepo;
        this._filterChain = [];
    }

    /**
     * Retrieves watchlist tickers
     * @param {boolean} [visible=false] - If true, only returns visible tickers
     * @returns {Array<string>} Array of watchlist tickers
     */
    getTickers(visible = false) {
        const selector = Constants.DOM.WATCHLIST.SYMBOL;
        return this._tickerListHelper(selector, visible);
    }

    /**
     * Get selected tickers from watchlist
     * @returns {Array<string>} Array of selected ticker symbols
     */
    getSelectedTickers() {
        const watchlist = Constants.DOM.WATCHLIST;
        return $(`${watchlist.SELECTED} ${watchlist.SYMBOL}:visible`)
            .toArray()
            .map(s => s.innerHTML);
    }

    /**
     * Helper function for retrieving ticker lists
     * @private
     * @param {string} selector - The CSS selector for finding elements
     * @param {boolean} visible - Whether to only get visible elements
     * @returns {Array<string>} Array of ticker strings
     */
    _tickerListHelper(selector, visible) {
        return $(visible ? selector + ":visible" : selector)
            .toArray()
            .map(s => s.innerHTML);
    }

    /**
     * Paints the TradingView watchlist
     */
    paintWatchList() {
        //Reset Color
        this.paintManager.resetColors(Constants.DOM.WATCHLIST.SYMBOL);

        // Paint Name and Flags
        this.paintManager.paintTickers(Constants.DOM.WATCHLIST.SYMBOL);

        // Ticker Set Summary Update
        this.displaySetSummary();

        // Mark FNO
        this.paintManager.applyCss(
            Constants.DOM.WATCHLIST.SYMBOL,
            Constants.EXCHANGE.FNO_SYMBOLS,
            Constants.UI.COLORS.FNO_CSS
        );

        // Paint Recent Tickers
        this.paintRecentTickers();
    }

    /**
     * Remove all watchlist filters
     */
    resetWatchList() {
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
    displaySetSummary() {
        const $watchSummary = $(`#${Constants.UI.IDS.AREAS.SUMMARY}`);
        $watchSummary.empty();

        const orderCategoryLists = this.orderRepo.getOrderCategoryLists();

        for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
            const count = orderCategoryLists.get(i).size;
            const color = Constants.UI.COLORS.LIST[i];

            const $label = buildLabel(count.toString() + '|', color)
                .data('color', color)
                .appendTo($watchSummary);

            $label.mousedown((e) => {
                this.addFilter({
                    color: $(e.target).data('color'),
                    index: e.which,
                    ctrl: e.originalEvent.ctrlKey,
                    shift: e.originalEvent.shiftKey
                });
            }).contextmenu(e => {
                e.preventDefault();
                e.stopPropagation();
            });
        }
    }

    /**
     * Creates and stores the WatchChangeEvent for the alert feed
     */
    paintAlertFeedEvent() {
        const watchList = this.getTickers();
        const recentList = Array.from(this.recentTickerRepo.getAll());
        const watchChangeEvent = new WatchChangeEvent(watchList, recentList);
        GM_setValue(Constants.STORAGE.EVENTS.TV_WATCH_CHANGE, watchChangeEvent);
    }

    /**
     * Adds a new filter to the filter chain
     * @param {Object} filter - The filter to add
     * @param {string} filter.color - The color of the filtered symbols
     * @param {number} filter.index - The mouse button index (1, 2, or 3)
     * @param {boolean} filter.ctrl - Whether the Ctrl key was pressed
     * @param {boolean} filter.shift - Whether the Shift key was pressed
     */
    addFilter(filter) {
        if (!filter.ctrl && !filter.shift) {
            // Reset chain if no modifier keys
            this._filterChain = [filter];
        } else {
            // Add to existing chain
            this._filterChain.push(filter);
        }
        this.applyFilters();
    }

    /**
     * Applies all active filters in the filter chain
     */
    applyFilters() {
        this._filterChain.forEach(filter => this._filterWatchList(filter));
    }

    /**
     * Filters the watchlist symbols based on the provided filter parameters
     * @private
     * @param {Object} filter - The filter parameters
     * @param {string} filter.color - The color of the filtered symbols
     * @param {number} filter.index - The mouse button index (1, 2, or 3)
     * @param {boolean} filter.ctrl - Whether the Ctrl key was pressed
     * @param {boolean} filter.shift - Whether the Shift key was pressed
     */
    _filterWatchList(filter) {
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