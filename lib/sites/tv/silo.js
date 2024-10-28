/**
 * Represents the primary configuration store for the TradingView enhancement script.
 * Persisted via GM_setValue(dataSiloStore, dataSilo)
 */
class DataSilo {
    /**
     * Maps TradingView tickers to Investing.com tickers
     * @type {Object<string, string>}
     * Key: TVTicker (e.g., "HDFC")
     * Value: InvestingTicker (e.g., "HDFC-NSE")
     */
    tickerMap;

    /**
     * Associates TradingView tickers with their exchange-qualified format
     * @type {Object<string, string>}
     * Key: TVTicker (e.g., "HDFC")
     * Value: ExchangeTicker (e.g., "NSE:HDFC")
     */
    exchangeMap;

    /**
     * Stores custom sequence settings for specific tickers
     * Determines timeframe analysis pattern (MWD or YR)
     * @type {Object<string, string>}
     * Key: TVTicker (e.g., "HDFC")
     * Value: SequenceType ("MWD" or "YR")
     * Where:
     * - MWD: Monthly-Weekly-Daily sequence
     * - YR: Yearly-Range sequence
     */
    sequenceMap;

    /**
     * Array of recently accessed TradingView tickers
     * Converted to recentTickersInMem Set during runtime
     * @type {string[]}
     * @example ["HDFC", "TCS", "RELIANCE"]
     */
    recentTickers;

    /**
     * Initialize empty DataSilo with default values
     */
    constructor() {
        this.tickerMap = {};
        this.exchangeMap = {};
        this.sequenceMap = {};
        this.recentTickers = [];
    }

    /**
     * Get investing ticker for given TV ticker
     * @param {string} tvTicker TradingView ticker
     * @returns {string|undefined} Investing ticker if mapped
     */
    getInvestingTicker(tvTicker) {
        return this.tickerMap[tvTicker];
    }

    /**
     * Get exchange qualified ticker
     * @param {string} tvTicker TradingView ticker
     * @returns {string} Exchange qualified ticker or original ticker
     */
    getExchangeTicker(tvTicker) {
        return this.exchangeMap[tvTicker] || tvTicker;
    }

    /**
     * Get sequence for given TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} defaultSequence Sequence to use if not mapped
     * @returns {string} Sequence type (MWD or YR)
     */
    getSequence(tvTicker, defaultSequence) {
        return this.sequenceMap[tvTicker] || defaultSequence;
    }

    /**
     * Pin exchange mapping for TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} exchange Exchange identifier
     */
    pinExchange(tvTicker, exchange) {
        this.exchangeMap[tvTicker] = `${exchange}:${tvTicker}`;
    }

    /**
     * Pin sequence for TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} sequence Sequence type
     */
    pinSequence(tvTicker, sequence) {
        this.sequenceMap[tvTicker] = sequence;
    }

    /**
     * Pin investing ticker mapping
     * @param {string} tvTicker TradingView ticker
     * @param {string} investingTicker Investing.com ticker
     */
    pinInvestingTicker(tvTicker, investingTicker) {
        this.tickerMap[tvTicker] = investingTicker;
    }

    /**
     * Load DataSilo instance from GM storage
     * @returns {DataSilo} Loaded instance
     */
    static load() {
        const data = GM_getValue(dataSiloStore, {});
        const silo = new DataSilo();
        silo.tickerMap = data.tickerMap || {};
        silo.exchangeMap = data.tvPinMap || {};  // Handle legacy name
        silo.sequenceMap = data.sequenceMap || {};
        silo.recentTickers = data.recentTickers || [];
        return silo;
    }

    /**
     * Save current DataSilo instance to GM storage
     */
    save() {
        GM_setValue(dataSiloStore, {
            tickerMap: this.tickerMap,
            tvPinMap: this.exchangeMap,  // Keep legacy name for compatibility
            sequenceMap: this.sequenceMap,
            recentTickers: this.recentTickers
        });
    }
}