const MIN_SELECTED_TICKERS = 2;

/**
 * Manages all ticker operations including retrieval, mapping, navigation and selection
 * @class TickerManager
 */
class TickerManager {
    /**
     * Manages all ticker operations including retrieval, mapping, navigation and selection
     * @param {RecentTickerRepo} recentTickerRepo Repository for recent tickers
     * @param {WaitUtil} waitUtil DOM operation manager
     * @param {SymbolManager} symbolManager Manager for symbol operations
     * @param {TradingViewScreenerManager} screenerManager Manager for screener operations
     * @param {TradingViewWatchlistManager} watchlistManager Manager for watchlist operations
     */
    constructor(recentTickerRepo, waitUtil, symbolManager, screenerManager, watchlistManager) {
        this._recentTickerRepo = recentTickerRepo;
        this._waitUtil = waitUtil;
        this._symbolManager = symbolManager;
        this._screenerManager = screenerManager;
        this._watchlistManager = watchlistManager;
    }
    /**
     * Gets current ticker from DOM
     * @returns {string} Current ticker symbol
     */
    getTicker() {
        return $(Constants.DOM.BASIC.TICKER).html();
    }

    /**
     * Gets current exchange from DOM
     * @returns {string} Current exchange
     */
    getCurrentExchange() {
        return $(Constants.DOM.BASIC.EXCHANGE).text();
    }

    /**
     * Maps current TradingView ticker to Investing ticker
     * @returns {string} Mapped Investing ticker or original if no mapping exists
     */
    getInvestingTicker() {
        const tvTicker = this.getTicker();
        return this._symbolManager.tvToInvesting(tvTicker);
    }

    /**
     * Opens specified ticker in TradingView
     * @param {string} ticker Ticker to open
     */
    openTicker(ticker) {
        const exchangeTicker = this._symbolManager.tvToExchangeTicker(ticker);
        this._waitUtil.waitClick(Constants.DOM.BASIC.TICKER);
        this._waitUtil.waitInput(Constants.DOM.POPUPS.SEARCH, exchangeTicker);
    }

    /**
     * Gets currently selected tickers from watchlist and screener
     * @param {function} getWatchListSelected Function to get watchlist selections
     * @param {function} getScreenerSelected Function to get screener selections
     * @returns {Array<string>} Selected tickers
     */
    getSelectedTickers(getWatchListSelected, getScreenerSelected) {
        // TODO: Fix now Broken functions migrated.
        let selected = getWatchListSelected().concat(getScreenerSelected());
        if (selected.length < MIN_SELECTED_TICKERS) {
            selected = [this.getTicker()];
        }
        return selected;
    }

    /**
     * Opens current ticker relative to its benchmark
     */
    openBenchmarkTicker() {
        const ticker = this.getTicker();
        const exchange = this.getCurrentExchange();
        
        let benchmark;
        switch (exchange) {
            case 'MCX':
                benchmark = 'MCX:GOLD1!';
                break;
            case Constants.EXCHANGE.TYPES.NSE:
                benchmark = 'NIFTY';
                break;
            case 'BINANCE':
                benchmark = 'BINANCE:BTCUSDT';
                break;
            default:
                benchmark = 'XAUUSD';
        }
        
        this.openTicker(`${ticker}/${benchmark}`);
    }

    /**
     * Check if there are any recent tickers
     * @returns {boolean} True if recent tickers exist
     */
    hasRecentTickers() {
        return this._recentTickerRepo.getRecentTickers().length > 0;
    }

    /**
     * Navigates through visible tickers in either screener or watchlist
     * @param {number} step - Number of steps to move (positive for forward, negative for backward)
     * @throws {Error} When no visible tickers are available
     * @returns {void}
     */
    navigateTickers(step) {
        const currentTicker = this.getTicker();
        const visibleTickers = this._getVisibleTickers();
        
        if (!visibleTickers.length) {
            throw new Error('No visible tickers available for navigation');
        }

        const nextTicker = this._calculateNextTicker(currentTicker, visibleTickers, step);
        this.openTicker(nextTicker);
    }

    /**
     * Gets currently visible tickers based on active view
     * @private
     * @returns {string[]} Array of visible ticker symbols
     */
    _getVisibleTickers() {
        return this.screenerManager.isScreenerVisible() ? 
            this.screenerManager.getTickers(true) : 
            this.watchlistManager.getTickers(true);
    }

    /**
     * Calculates the next ticker based on current position and step
     * @private
     * @param {string} currentTicker - Currently selected ticker
     * @param {string[]} tickers - Array of available tickers
     * @param {number} step - Number of steps to move
     * @returns {string} Next ticker symbol
     */
    _calculateNextTicker(currentTicker, tickers, step) {
        const currentIndex = tickers.indexOf(currentTicker);
        let nextIndex = currentIndex + step;

        // Handle wraparound
        if (nextIndex < 0) {
            nextIndex = tickers.length - 1;
        } else if (nextIndex >= tickers.length) {
            nextIndex = 0;
        }

        return tickers[nextIndex];
    }
}