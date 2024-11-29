class SequenceHandler {
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
     * Displays sequence information in the input
     */
     displaySequence() {
        const sequence = this.sequenceManager.getCurrentSequence();
        
        const message = `${tvTicker}:${sequence}`;
        this._setValue(message);
        this._setBackgroundColor(sequence);
    }

    _pinSequenceForTicker(ticker) {
        pinSequence(ticker);
    }

    _updateSequenceDisplay() {
        displaySequence();
    }
}