/**
 * Manages TradingView watchlist operations
 * @class TradingViewWatchlistManager
 */
class TradingViewWatchlistManager {
    /**
     * Retrieves watchlist tickers
     * @param {boolean} [visible=false] - If true, only returns visible tickers
     * @returns {Array<string>} Array of watchlist tickers
     */
    getWatchlistTickers(visible = false) {
        const selector = Constants.DOM.WATCHLIST.SYMBOL;
        return this._tickerListHelper(selector, visible);
    }

    /**
     * Get selected tickers from watchlist
     * @returns {Array<string>} Array of selected ticker symbols
     */
    getSelectedWatchlistTickers() {
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
}