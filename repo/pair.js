/**
 * Maps Investing.com tickers to their pair information
 * @type {Object<string, PairInfo>}
 * Key: InvestingTicker (e.g., "HDFC-NSE")
 * Value: PairInfo { name: string, pairId: string, exchange: string }
 */
class PairRepo extends MapRepo {
    constructor() {
        super(pairMapStore);
    }

    /**
     * @override
     * @param {Object} data Raw storage data
     * @returns {Map<string, PairInfo>} Map of pair information
     */
    _deserialize(data) {
        const pairMap = new Map();
        Object.entries(data).forEach(([ticker, info]) => {
            pairMap.set(ticker, new PairInfo(
                info.name,
                info.pairId,
                info.exchange
            ));
        });
        return pairMap;
    }

    /**
     * @override
     * @returns {Object} Serialized pair information
     */
    _serialize() {
        const data = {};
        this._map.forEach((pairInfo, ticker) => {
            data[ticker] = pairInfo;
        });
        return data;
    }

    /**
     * Get pair info for given investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @returns {PairInfo|null} Pair info if mapped, null otherwise
     */
    getPairInfo(investingTicker) {
        return this.get(investingTicker) || null;
    }

    /**
     * Get all mapped investing tickers
     * @returns {string[]} Array of investing tickers
     */
    getAllInvestingTickers() {
        return this.getAllKeys();
    }

    /**
     * Pin pair information for investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @param {PairInfo} pairInfo Pair information
     */
    pinPair(investingTicker, pairInfo) {
        this.set(investingTicker, new PairInfo(
            pairInfo.name,
            pairInfo.pairId,
            pairInfo.exchange
        ));
    }
}