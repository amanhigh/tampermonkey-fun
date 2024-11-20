/**
 * Maps TradingView tickers to exchange-qualified format
 * @type {Object<string, string>}
 * Key: TVTicker (e.g., "HDFC")
 * Value: ExchangeTicker (e.g., "NSE:HDFC")
 */
class ExchangeRepo extends MapRepo {
    /**
     * @param {RepoCron} repoCron Repository auto-save manager
     */
    constructor(repoCron) {
        super(repoCron, "exchangeRepo");
    }

    /**
     * Get exchange qualified ticker
     * @param {string} tvTicker TradingView ticker
     * @returns {string} Exchange qualified ticker or original ticker
     */
    getExchangeTicker(tvTicker) {
        return this.get(tvTicker) || tvTicker;
    }

    /**
     * Pin exchange mapping for TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} exchange Exchange identifier
     */
    pinExchange(tvTicker, exchange) {
        this.set(tvTicker, `${exchange}:${tvTicker}`);
    }
}