/**
 * Handles button-related events and actions
 */
class ButtonHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('refreshButton', this.HandleRefreshButton.bind(this));
        this.eventManager.registerHandler('alertButton', this.HandleAlertButton.bind(this));
        this.eventManager.registerHandler('journalButton', this.HandleJournalButton.bind(this));
        this.eventManager.registerHandler('sequenceSwitch', this.HandleSequenceSwitch.bind(this));
    }

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
     * Handles the sequence switch event
     * @param {Event} e - The event object
     */
    HandleSequenceSwitch(e) {
        const currentTicker = getTicker();
        
        // Pin the sequence for the current ticker
        this._pinSequenceForTicker(currentTicker);
        
        // Update the sequence display
        this._updateSequenceDisplay();
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
        toggleUI(`#${journalId}`);
    }

    _pinSequenceForTicker(ticker) {
        pinSequence(ticker);
    }

    _updateSequenceDisplay() {
        displaySequence();
    }

    _handleOrderSetCleanup() {
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
}
