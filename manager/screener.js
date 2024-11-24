/**
 * Manages TradingView screener operations
 * @class TradingViewScreenerManager
 */
class TradingViewScreenerManager {
    /**
     * @param {TradingViewManager} tradingViewManager - TradingViewManager instance
     * @param {PaintManager} paintManager - PaintManager instance
     * @param {RecentTickerRepo} recentTickerRepo - Repository for recent tickers
     * @param {OrderRepo} orderRepo - Repository for orders
     * @constructor
     * @returns {Array<string>} Array of screener tickers
     */
    constructor(tradingViewManager, paintManager, recentTickerRepo, orderRepo) {
        this.tradingViewManager = tradingViewManager;
        this.paintManager = paintManager;
        this.recentTickerRepo = recentTickerRepo;
        this.orderRepo = orderRepo;
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
        const colorList = Constants.UI.COLORS.LIST;

        // Must Run in this Order- Clear, WatchList, Kite
        this.paintManager.resetColors(screenerSymbolSelector);

        // Paint Recently Watched
        const recentTickers = this.recentTickerRepo.getAll();
        this.paintManager.applyCss(screenerSymbolSelector, recentTickers, { color: colorList[3] });

        // Paint Fno
        this.paintManager.applyCss(screenerSymbolSelector, this.fnoSymbols, Constants.UI.COLORS.FNO_CSS);

        // Paint Name and Flags
        this.paintManager.paintTickers(screenerSymbolSelector);

        // Paint Watchlist (Overwrite White)
        const watchlistSet = this.orderRepo.getOrderCategoryLists().get(5);
        this.paintManager.applyCss(screenerSymbolSelector, watchlistSet, { color: colorList[6] });
    }
}
