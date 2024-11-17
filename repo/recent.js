
/**
 * Repository for managing recent tickers
 */
class RecentTickerRepo {
    /**
     * Set of recent TradingView tickers
     * @type {Set<string>}
     * @private
     */
    _recentTickers;

    /**
     * @param {string[]} recentTickers Initial recent tickers
     */
    constructor(recentTickers = []) {
        this._recentTickers = new Set(recentTickers);
    }

    /**
     * Check if ticker is in recent list
     * @param {string} tvTicker TradingView ticker
     * @returns {boolean} True if ticker is recent
     */
    isRecent(tvTicker) {
        return this._recentTickers.has(tvTicker);
    }

    /**
     * Get count of recent tickers
     * @returns {number} Number of recent tickers
     */
    getCount() {
        return this._recentTickers.size;
    }

    /**
     * Get recent tickers set
     * @returns {Set<string>} Set of recent TV tickers
     */
    getAll() {
        return this._recentTickers;
    }

    /**
     * Add a TV ticker to recent tickers
     * @param {string} tvTicker TradingView ticker
     */
    add(tvTicker) {
        this._recentTickers.add(tvTicker);
    }

    /**
     * Clear all recent tickers
     */
    clear() {
        this._recentTickers.clear();
    }
}
