/**
 * Repository for managing exchange mappings
 */
class ExchangeRepo {
    /**
     * Maps TradingView tickers to exchange-qualified format
     * @type {Object<string, string>}
     * Key: TVTicker (e.g., "HDFC")
     * Value: ExchangeTicker (e.g., "NSE:HDFC")
     * @private
     */
    _exchangeMap;

    /**
     * @param {Object<string, string>} exchangeMap Initial exchange mappings
     */
    constructor(exchangeMap = {}) {
        this._exchangeMap = exchangeMap;
    }

    /**
     * Get exchange qualified ticker
     * @param {string} tvTicker TradingView ticker
     * @returns {string} Exchange qualified ticker or original ticker
     */
    getExchangeTicker(tvTicker) {
        return this._exchangeMap[tvTicker] || tvTicker;
    }

    /**
     * Pin exchange mapping for TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} exchange Exchange identifier
     */
    pinExchange(tvTicker, exchange) {
        this._exchangeMap[tvTicker] = `${exchange}:${tvTicker}`;
    }
}