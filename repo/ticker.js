/**
 * Repository for managing TradingView to Investing.com ticker mappings
 */
class TickerRepo extends MapRepo {
    /**
     * @private
     * @type {Map<string, string>}
     */
    _reverseMap;

    constructor() {
        super(tickerInfoStore);
        this._buildReverseMap();
    }

    /**
     * Get investing ticker for given TV ticker
     * @param {string} tvTicker TradingView ticker
     * @returns {string|undefined} Investing ticker if mapped
     */
    getInvestingTicker(tvTicker) {
        return this.get(tvTicker);
    }

    /**
     * Get TV ticker for given investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @returns {string} TV ticker if mapped, otherwise original ticker
     */
    getTvTicker(investingTicker) {
        return this._reverseMap.get(investingTicker) || investingTicker;
    }

    /**
     * Pin investing ticker mapping and update reverse map
     * @param {string} tvTicker TradingView ticker
     * @param {string} investingTicker Investing.com ticker
     */
    pinInvestingTicker(tvTicker, investingTicker) {
        this.set(tvTicker, investingTicker);
        this._reverseMap.set(investingTicker, tvTicker);
    }

    /**
     * Rebuilds the reverse ticker map
     * @private
     */
    _buildReverseMap() {
        this._reverseMap = new Map();
        this._map.forEach((investingTicker, tvTicker) => {
            this._reverseMap.set(investingTicker, tvTicker);
        });
    }

    /**
     * Override set to maintain reverse map
     * @override
     */
    set(key, value) {
        super.set(key, value);
        this._reverseMap.set(value, key);
    }

    /**
     * Override delete to maintain reverse map
     * @override
     */
    delete(key) {
        const value = this.get(key);
        if (value) {
            this._reverseMap.delete(value);
        }
        return super.delete(key);
    }

    /**
     * Override clear to maintain reverse map
     * @override
     */
    clear() {
        super.clear();
        this._reverseMap.clear();
    }
}