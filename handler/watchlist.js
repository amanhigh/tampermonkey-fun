/**
 * Handles all watchlist-related events and updates
 */
class WatchListHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('watchListChange', this.onWatchListChange.bind(this));
    }

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

    _resetWatchListState() {
        resetWatchList();
        updateWatchListSet();
    }

    _updateUIComponents() {
        paintWatchList();
        paintScreener();
        paintName();
        paintAlertFeedEvent();
    }

    _applyFilters() {
        filterChain.forEach((f) => FilterWatchList(f));
    }
}