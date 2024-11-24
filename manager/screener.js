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
}