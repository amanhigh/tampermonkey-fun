/**
 * Handles all watchlist-related events and updates
 */
class WatchListHandler {
    /**
     * Creates a new WatchListHandler instance
     * @param {TradingViewWatchlistManager} watchlistManager - Manager for watchlist operations
     * @param {TradingViewScreenerManager} screenerManager - Manager for screener operations
     * @param {TradingViewManager} tradingViewManager - Manager for TradingView operations
     */
    constructor(watchlistManager, screenerManager, tradingViewManager) {
        this.watchlistManager = watchlistManager;
        this.screenerManager = screenerManager;
        this.tradingViewManager = tradingViewManager;
    }

    /**
     * Handles watchlist change events
     * Updates all related components
     */
    onWatchListChange() {
        waitOn("watchListChangeEvent", 2, () => {
            // Reset and update watchlist state
            this._resetWatchListState();
            
            // Update UI components
            this._updateUIComponents();
            
            // Apply filters
            this._applyFilters();
        });
    }

    /**
     * Resets the watchlist state
     * @private
     */
    _resetWatchListState() {
        // Reset both watchlist and screener views
        this.watchlistManager.resetWatchList();
        this._updateWatchListSet(); //TODO: Migrate in order.js
    }


    /**
     * Updates all UI components related to watchlist
     * @private
     */
    _updateUIComponents() {
        // Paint watchlist items
        this.watchlistManager.paintWatchList();
        
        // Paint screener items if visible
        this.screenerManager.paintScreener();
        
        // Paint the name in header
        this.tradingViewManager.paintName();
        
        // Update alert feed with watchlist changes
        this.watchlistManager.paintAlertFeedEvent();
    }

    _applyFilters() {
        filterChain.forEach((f) => FilterWatchList(f));
    }
}