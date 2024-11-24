/**
 * Manages TradingView screener operations
 * @class TradingViewScreenerManager
 */
class TradingViewScreenerManager {
    /**
     * Retrieves screener tickers
     * @param {boolean} [visible=false] - If true, only returns visible tickers
     * @returns {Array<string>} Array of screener tickers
     */
    constructor(tradingViewManager, paintManager, dataSilo, orderSet, fnoSymbols) {
        this.tradingViewManager = tradingViewManager;
        this.paintManager = paintManager;
        this.dataSilo = dataSilo;
        this.orderSet = orderSet;
        this.fnoSymbols = fnoSymbols;
    }

    getScreenerTickers(visible = false) {
        const selector = Constants.DOM.SCREENER.SYMBOL;
        return this._tickerListHelper(selector, visible);
    }

    /**
     * Get selected tickers from screener
     * @returns {Array<string>} Array of selected ticker symbols
     */
    getSelectedScreenerTickers() {
        const screener = Constants.DOM.SCREENER;
        return $(`${screener.SELECTED} ${screener.SYMBOL}:visible`)
            .toArray()
            .map(s => s.innerHTML);
    }

    /**
     * Check if screener is currently visible
     * @returns {boolean} True if screener is visible
     */
    isScreenerVisible() {
        return $(Constants.DOM.SCREENER.BUTTON).attr('data-active') === 'false';
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

    paintScreener() {
        const screenerSymbolSelector = Constants.DOM.SCREENER.SYMBOL;
        const colorList = Constants.SELECTORS.BASIC.COLOR_LIST;
        const fnoCss = {
            'border-top-style': 'groove',
            'border-width': 'medium'
        };

        // Must Run in this Order- Clear, WatchList, Kite
        this.paintManager.resetColors(screenerSymbolSelector);

        // Paint Recently Watched
        this.paintManager.applyCss(screenerSymbolSelector, new Set(this.dataSilo.getRecentTickers()), { color: colorList[3] });

        // Paint Fno
        this.paintManager.applyCss(screenerSymbolSelector, this.fnoSymbols, fnoCss);

        // Paint Name and Flags
        this.paintManager.paintTickers(screenerSymbolSelector);

        // Paint Watchlist (Overwrite White)
        this.paintManager.applyCss(screenerSymbolSelector, this.orderSet.get(5), { color: colorList[6] });
    }
}