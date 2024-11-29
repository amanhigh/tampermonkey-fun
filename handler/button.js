/**
 * Handles button-related events and actions
 */
class ButtonHandler {
    HandleRefreshButton() {
        // Refersh Ticker
        this.eventManager.emit('tickerChange');

        // Refresh alerts
        ForceRefreshAlerts();

        // Handle order set cleanup
        this._handleOrderSetCleanup();
    }

    HandleAlertButton(e) {
        if (e.ctrlKey) {
            // Map current exchange to current TV ticker
            pinExchangeTicker(getTicker(), getExchange());
        } else {
            createHighAlert();
        }
    }

    /**
     * Handles the journal button toggle event
     * @param {Event} e - The event object
     */
    HandleJournalButton(e) {
        this._toggleJournalUI();
    }

    /**
     * Handles the alert context menu event
     * @param {Event} e - The context menu event object
     */
    HandleAlertContextMenu(e) {
        // Prevent default context menu
        e.preventDefault();

        // Trigger ticker refresh and audit
        this._refreshAndAuditTicker();
    }
    
    // Private helper methods

    _refreshAndAuditTicker() {
        // Emit ticker change event
        this.eventManager.emit('tickerChange');

        // Perform audit
        AuditCurrentTicker();
    }
    
    _toggleJournalUI() {
        // HACK: Use UI Util
        toggleUI(`#${journalId}`);
    }
}
