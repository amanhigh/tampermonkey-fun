/**
 * Manages trading journal entries and operations
 * 
 * RecordJournal function records the journal entry based on the timeframe and reason provided.
 * It gets the timeframe from the button clicked, prompts the user for the reason,
 * determines the type of entry based on the ticker and order set, and then copies the entry to the clipboard.
 * @class JournalManager
 */
class JournalManager {
    /**
     * @param {OrderRepo} orderRepo Repository for order management
     * @param {SequenceManager} sequenceManager Manager for sequence operations
     */
    constructor(orderRepo, sequenceManager) {
        this._orderRepo = orderRepo;
        this._sequenceManager = sequenceManager;
    }

    // TODO: JournalHandler
    // function RecordJournal() {

    //     ReasonPrompt(function (reason) {
    // tag = createEntry
    //         //Put All in Journal with Type
    //         RecordTicker(tag);
    //     })
    // }

    /**
     * Records a journal entry based on sequence and current context
     * @param {string} buttonId Button identifier that triggered the record
     * @param {string} reason User provided reason for the entry
     * @param {string} currentTicker Current trading symbol
     * @returns {string} Generated journal tag
     */
    createEntry(buttonId, reason, currentTicker) {
        // Get sequence preference for current ticker
        const sequence = this._sequenceManager.getCurrentSequence();
        
        // Build timeframe tag with sequence
        // TODO: buttonId earlier this.id ?
        const timeframeTag = `${sequence.toLowerCase()}.${buttonId}`;
        
        // Determine entry type based on order status
        const type = this._determineEntryType(currentTicker);
        
        // Build final tag with reason if provided
        const finalType = this._appendReason(type, reason);
        
        // Construct complete journal tag
        return `${currentTicker}.${timeframeTag}.${finalType}`;
    }

    /**
     * Determines the type of journal entry based on ticker's presence in order sets
     * @private
     * @param {string} ticker Trading symbol to check
     * @returns {string} Entry type classification
     */
    _determineEntryType(ticker) {
        const orderLists = this._orderRepo.getOrderCategoryLists();

        if (orderLists.get(2).has(ticker)) {
            return "set";
        } 
        
        if (orderLists.get(0).has(ticker) || 
            orderLists.get(1).has(ticker) || 
            orderLists.get(4).has(ticker)) {
            return "result";
        }

        return "rejected";
    }

    /**
     * Appends reason to entry type if provided
     * @private
     * @param {string} type Base entry type
     * @param {string} reason Optional reason for the entry
     * @returns {string} Combined type and reason
     */
    _appendReason(type, reason) {
        if (reason && reason !== "" && reason !== "Cancel") {
            return `${type}.${reason}`;
        }
        return type;
    }
}