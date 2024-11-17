/**
 * Repository for managing sequence preferences
 */
class SequenceRepo {
    /**
     * Stores custom sequence settings for specific tickers
     * Determines timeframe analysis pattern (MWD or YR)
     * @type {Object<string, string>}
     * Key: TVTicker (e.g., "HDFC")
     * Value: SequenceType ("MWD" or "YR")
     * Where:
     * - MWD: Monthly-Weekly-Daily sequence
     * - YR: Yearly-Range sequence
     * @private
     */
    _sequenceMap;

    /**
     * @param {Object<string, string>} sequenceMap Initial sequence mappings
     */
    constructor(sequenceMap = {}) {
        this._sequenceMap = sequenceMap;
    }

    /**
     * Get sequence for given TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} defaultSequence Sequence to use if not mapped
     * @returns {string} Sequence type (MWD or YR)
     */
    getSequence(tvTicker, defaultSequence) {
        return this._sequenceMap[tvTicker] || defaultSequence;
    }

    /**
     * Pin sequence for TV ticker
     * @param {string} tvTicker TradingView ticker
     * @param {string} sequence Sequence type
     */
    pinSequence(tvTicker, sequence) {
        this._sequenceMap[tvTicker] = sequence;
    }
}
