/**
 * Manages pair information mapping between Investing.com tickers and their pair details
 * Persisted via GM_setValue(pairMapStore, pairMap)
 */
class PairRepo {
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
     * @returns {PairRepo} Loaded instance
     */
    static load() {
        const data = GM_getValue(pairMapStore, {});
        const silo = new PairRepo();

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