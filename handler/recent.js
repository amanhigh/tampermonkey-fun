/**
 * Handles recent checkbox UI element operations
 * @class RecentHandler
 */
class RecentHandler {
    /**
     * @param {string} recentId DOM id for recent checkbox
     * @param {TickerManager} tickerManager Manager for ticker operations
     */
    constructor(recentId, tickerManager) {
        this.recentId = recentId;
        this.tickerManager = tickerManager;
        this._initialize();
    }

    /**
     * Initialize checkbox state based on recent tickers
     * @private
     */
    _initialize() {
        const hasRecentTickers = this.tickerManager.hasRecentTickers();
        $(`#${this.recentId}`).prop('checked', hasRecentTickers);
    }
}