/**
 * Manages pair information and mappings
 * @class PairManager
 */
class PairManager {
    /**
     * @param {PairRepo} pairRepo Repository for pair operations
     */
    constructor(pairRepo) {
        this._pairRepo = pairRepo;
    }

    /**
     * Get all investing tickers that have been mapped for Alerts.
     * @returns {string[]} Array of investing tickers
     */
    getAllInvestingTickers() {
        return this._pairRepo.getAllInvestingTickers();
    }

    /**
     * Map investing ticker to alert pair.
     * @param {string} investingTicker Investing.com ticker
     * @param {PairInfo} pairInfo Pair information { name: string, pairId: string, exchange: string }
     */
    createInvestingToPairMapping(investingTicker, pairInfo) {
        this._pairRepo.pinPair(investingTicker, pairInfo);
    }

    /**
     * Map investing pair info from the cache
     * @param {string} investingTicker Investing.com ticker
     * @returns {PairInfo|null} The cached pair data or null if not found
     */
    investingTickerToPairInfo(investingTicker) {
        return this._pairRepo.getPairInfo(investingTicker);
    }

    /**
     * Deletes a ticker's pair info
     * @param {string} investingTicker Investing.com ticker
     */
    deletePairInfo(investingTicker) {
        this._pairRepo.remove(investingTicker);
    }
}