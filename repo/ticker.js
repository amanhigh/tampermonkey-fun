/**
 * Repository for managing TradingView to Investing.com ticker mappings
 */
class TickerRepo {
    /**
     * Maps TradingView tickers to Investing.com tickers
     * @type {Object<string, string>}
     * @private
     */
    _tickerMap;

    /**
     * Reverse mapping from Investing.com tickers to TradingView tickers
     * @type {Object<string, string>}
     * @private
     */
    _reverseTickerMap;

    /**
     * @param {Object<string, string>} tickerMap Initial ticker mappings
     */
    constructor(tickerMap = {}) {
        this._tickerMap = tickerMap;
        this._buildReverseMap();
    }

    /**
     * Get investing ticker for given TV ticker
     * @param {string} tvTicker TradingView ticker
     * @returns {string|undefined} Investing ticker if mapped
     */
    getInvestingTicker(tvTicker) {
        return this._tickerMap[tvTicker];
    }

    /**
     * Get TV ticker for given investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @returns {string} TV ticker if mapped, otherwise original ticker
     */
    getTvTicker(investingTicker) {
        return this._reverseTickerMap[investingTicker] || investingTicker;
    }

    /**
     * Pin investing ticker mapping and update reverse map
     * @param {string} tvTicker TradingView ticker
     * @param {string} investingTicker Investing.com ticker
     */
    pinInvestingTicker(tvTicker, investingTicker) {
        this._tickerMap[tvTicker] = investingTicker;
        this._reverseTickerMap[investingTicker] = tvTicker;
    }

    /**
     * Rebuilds the reverse ticker map
     * @private
     */
    _buildReverseMap() {
        this._reverseTickerMap = {};
        for (const [tvTicker, investingTicker] of Object.entries(this._tickerMap)) {
            this._reverseTickerMap[investingTicker] = tvTicker;
        }
    }
}