/**
* Repository for managing sequence preferences
* Stores custom sequence settings for specific tickers
* Determines timeframe analysis pattern (MWD or YR)
* @type {Object<string, string>}
* Key: TVTicker (e.g., "HDFC")
* Value: SequenceType ("MWD" or "YR")
* Where:
* - MWD: Monthly-Weekly-Daily sequence
* - YR: Yearly-Range sequence
 */
class SequenceRepo extends MapRepo {
    /**
     * @param {RepoCron} repoCron Repository auto-save manager
     */
    constructor(repoCron) {
        super(repoCron, "sequenceRepo");
    }

    /**
     * @protected
     * @param {Object} data Raw storage data
     * @returns {Map<string, string>} Map of sequence preferences
     */
    _deserialize(data) {
        return new Map(Object.entries(data));
    }

    /**
     * Get sequence for given TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} defaultSequence Sequence to use if not mapped
     * @returns {string} Sequence type (MWD or YR)
     */
    getSequence(tvTicker, defaultSequence) {
        return this.get(tvTicker) || defaultSequence;
    }

    /**
     * Pin sequence for TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} sequence Sequence type
     */
    pinSequence(tvTicker, sequence) {
        this.set(tvTicker, sequence);
    }
}