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

    handleWatchlistCleanup() {
        // Perform dry run to get potential deletion count
        const dryRunCount = orderSet.dryRunClean();

        //Clean Order Set after unfilter completes
        setTimeout(() => {
            if (dryRunCount < 5) {
                // Auto update if deletion count is less than 5
                const cleanCount = orderSet.clean();
                orderSet.save();
            } else {
                // Prompt user for confirmation if deletion count is 5 or more
                const confirmDeletion = confirm(
                    `Potential Deletions: ${dryRunCount}. Proceed with cleanup?`
                );
                
                if (confirmDeletion) {
                    const cleanCount = orderSet.clean();
                    orderSet.save();
                } else {
                    message("Cleanup aborted by user.", 'red');
                }
            }
        }, 1000);
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
        this.watchlistManager.applyFilters();
    }
}