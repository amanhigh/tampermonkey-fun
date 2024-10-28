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
     * Private field for reverse ticker mapping
     * @type {Object<string, string>}
     * Key: InvestingTicker (e.g., "HDFC-NSE")
     * Value: TVTicker (e.g., "HDFC")
     * @private
     */
    _reverseTickerMap;

    /**
     * Private field for recent tickers set
     * @type {Set<string>}
     * Contains TVTickers recently accessed
     * @private
     */
    _recentTickersSet;

    /**
     * Initialize empty DataSilo with default values
     */
    constructor() {
        this.tickerMap = {};
        this.exchangeMap = {};
        this.sequenceMap = {};
        this._reverseTickerMap = {};
        this._recentTickersSet = new Set();
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
     * Get TV ticker for given investing ticker using reverse mapping
     * @param {string} investingTicker Investing.com ticker
     * @returns {string} TV ticker if mapped, otherwise original ticker
     */
    getTvTicker(investingTicker) {
        return this._reverseTickerMap[investingTicker] || investingTicker;
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
     * Check if ticker is in recent list
     * @param {string} tvTicker TradingView ticker
     * @returns {boolean} True if ticker is recent
     */
    isRecentTicker(tvTicker) {
        return this._recentTickersSet.has(tvTicker);
    }

    /**
     * Get count of recent tickers
     * @returns {number} Number of recent tickers
     */
    getRecentTickerCount() {
        return this._recentTickersSet.size;
    }

    /**
     * Get recent tickers set
     * @returns {Set<string>} Set of recent TV tickers
     */
    getRecentTickers() {
        return this._recentTickersSet;
    }


    /**
     * Add a TV ticker to recent tickers
     * @param {string} tvTicker TradingView ticker
     */
    addRecentTicker(tvTicker) {
        this._recentTickersSet.add(tvTicker);
    }

    /**
     * Clear all recent tickers
     */
    clearRecentTickers() {
        this._recentTickersSet.clear();
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
     * Pin investing ticker mapping and update reverse map
     * @param {string} tvTicker TradingView ticker
     * @param {string} investingTicker Investing.com ticker
     */
    pinInvestingTicker(tvTicker, investingTicker) {
        this.tickerMap[tvTicker] = investingTicker;
        this._reverseTickerMap[investingTicker] = tvTicker;
    }

    /**
     * Rebuilds the reverse ticker map from current tickerMap
     * Called internally during load and save operations
     * @private
     */
    _buildReverseTickerMap() {
        this._reverseTickerMap = {};
        for (let tvTicker in this.tickerMap) {
            const investingTicker = this.tickerMap[tvTicker];
            this._reverseTickerMap[investingTicker] = tvTicker;
        }
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
        silo._recentTickersSet = new Set(data.recentTickers || []);
        silo._buildReverseTickerMap();  // Build reverse map after loading
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
            recentTickers: [...this._recentTickersSet]
        });
    }
}

/**
 * Manages pair information mapping between Investing.com tickers and their pair details
 * Persisted via GM_setValue(pairMapStore, pairMap)
 */
class PairSilo {
    /**
     * Maps Investing.com tickers to their pair information
     * @type {Object<string, PairInfo>}
     * Key: InvestingTicker (e.g., "HDFC-NSE")
     * Value: PairInfo { name: string, pairId: string, exchange: string }
     * @private
     */
    _pairMap;

    /**
     * Initialize empty PairSilo
     */
    constructor() {
        this._pairMap = {};
    }

    /**
     * Get pair info for given investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @returns {PairInfo|null} Pair info if mapped, null otherwise
     */
    getPairInfo(investingTicker) {
        return this._pairMap[investingTicker] || null;
    }

    /**
     * Get all mapped investing tickers
     * @returns {string[]} Array of investing tickers
     */
    getAllInvestingTickers() {
        return Object.keys(this._pairMap);
    }

    /**
     * Check if investing ticker has pair mapping
     * @param {string} investingTicker Investing.com ticker
     * @returns {boolean} True if ticker is mapped
     */
    hasPairInfo(investingTicker) {
        return investingTicker in this._pairMap;
    }

    /**
     * Pin pair information for investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @param {PairInfo} pairInfo Pair information
     */
    pinPair(investingTicker, pairInfo) {
        this._pairMap[investingTicker] = new PairInfo(
            pairInfo.name,
            pairInfo.pairId,
            pairInfo.exchange
        );
    }

    /**
     * Remove pair information for investing ticker
     * @param {string} investingTicker Investing.com ticker
     */
    removePair(investingTicker) {
        delete this._pairMap[investingTicker];
    }

    /**
     * Load PairSilo instance from GM storage
     * @returns {PairSilo} Loaded instance
     */
    static load() {
        const data = GM_getValue(pairMapStore, {});
        const silo = new PairSilo();

        // Convert raw data to PairInfo objects during load
        for (const [ticker, info] of Object.entries(data)) {
            silo._pairMap[ticker] = new PairInfo(
                info.name,
                info.pairId,
                info.exchange
            );
        }

        return silo;
    }

    /**
     * Save current PairSilo instance to GM storage
     * Converts PairInfo objects to plain objects for storage
     */
    save() {
        // Store the _pairMap directly as PairInfo objects are simple data objects
        GM_setValue(pairMapStore, this._pairMap);
    }
}

/**
 * Represents pair information for investing
 */
class PairInfo {
    constructor(name, pairId, exchange) {
        this.name = name;
        this.pairId = pairId;
        this.exchange = exchange;
    }
}

class Alert {
    Id
    Price
    PairId

    constructor(pairId, price) {
        this.PairId = pairId;
        this.Price = price;
    }
}