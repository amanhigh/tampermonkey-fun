/**
 * Manages ticker operations
 * @class TickerManager
 */
class TickerManager {
    /**
     * @param {RecentTickerRepo} recentTickerRepo Repository for recent tickers
     */
    constructor(recentTickerRepo) {
        this._recentTickerRepo = recentTickerRepo;
    }

    /**
     * Check if there are any recent tickers
     * @returns {boolean} True if recent tickers exist
     */
    hasRecentTickers() {
        return this._recentTickerRepo.getRecentTickers().length > 0;
    }
}