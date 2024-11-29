/**
 * Handles all ticker-related events and state management
 */
class TickerHandler {
    setupEventListeners() {
        this.eventManager.registerHandler('tickerChange', this.onTickerChange.bind(this));
        this.eventManager.registerHandler('recentTickerReset', this.onRecentTickerReset.bind(this));
    }

    onTickerChange() {
        //HACK: Make Event Based when New Ticker Appears
        waitOn("tickerChange", 150, () => {
            AlertRefreshLocal();

            // Fetch Orders and update summary
            const gttOrderMap = GttOrderMap.loadFromGMValue(gttOrderEvent);
            gttSummary(gttOrderMap);

            // Update UI
            paintName();

            // Handle recent ticker functionality
            this._handleRecentTicker();

            // Display sequence
            displaySequence();
        });
    }

    onRecentTickerReset() {
        const recentEnabled = $(`#${recentId}`).prop('checked');
        
        if (recentEnabled) {
            message('Recent Enabled', 'green');
        } else {
            dataSilo.clearRecentTickers();
            paintScreener();
            paintAlertFeedEvent();
            message('Recent Disabled', 'red');
        }
    }

    _handleRecentTicker() {
        const recentEnabled = $(`#${recentId}`).prop('checked');
        const ticker = getTicker();
        
        if (recentEnabled && !dataSilo.isRecentTicker(ticker)) {
            dataSilo.addRecentTickers(ticker);
            paintScreener();
            paintAlertFeedEvent();
        }
    }
}