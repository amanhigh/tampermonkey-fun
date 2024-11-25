/**
 * Manages sequence and timeframe operations for TradingView
 * @class SequenceManager
 */
class SequenceManager {
    /**
     * @param {SequenceRepo} sequenceRepo Repository for sequence operations
     */
    constructor(sequenceRepo) {
        this._sequenceRepo = sequenceRepo;
        this._freezeSequence = null;  
    }

    /**
     * Get default sequence based on exchange
     * @param {string} exchange Exchange identifier
     * @returns {string} Default sequence (MWD or YR)
     */
    getDefaultSequence(exchange) {
        return exchange === Constants.EXCHANGE.TYPES.NSE 
            ? Constants.TIME.SEQUENCE_TYPES.DEFAULT  // MWD
            : Constants.TIME.SEQUENCE_TYPES.HIGH;    // YR
    }

    /**
     * Maps TV ticker to sequence preference, falling back to exchange default if not mapped
     * @param {string} tvTicker TradingView ticker
     * @param {string} defaultSequence Sequence to use if not mapped (MWD or YR)
     * @returns {string} Sequence type (MWD or YR)
     */
    tvTickerToSequence(tvTicker, defaultSequence) {
        return this._sequenceRepo.getSequence(tvTicker, defaultSequence);
    }

    /**
     * Creates or updates mapping between TV ticker and sequence preference
     * @param {string} tvTicker TradingView ticker
     * @param {string} currentSequence Current sequence type (MWD or YR)
     */
    flipTvTickerSequence(tvTicker, currentSequence) {
        // Flip between MWD and YR
        const sequence = currentSequence === Constants.TIME.SEQUENCE_TYPES.HIGH 
            ? Constants.TIME.SEQUENCE_TYPES.DEFAULT  // MWD
            : Constants.TIME.SEQUENCE_TYPES.HIGH;    // YR
        
        this._sequenceRepo.pinSequence(tvTicker, sequence);
    }

    /**
     * Maps sequence and index to timeframe configuration
     * @param {string} sequence Sequence type (MWD or YR)
     * @param {number} timeFrameIndex The index of the time frame (0-3)
     * @returns {Object} Timeframe configuration containing index, symbol, and style
     */
    sequenceToTimeFrame(sequence, timeFrameIndex) {
        return Constants.TIME.SEQUENCES[sequence][timeFrameIndex];
    }

     /**
     * Toggles sequence freeze state
     * Uses current sequence when enabling freeze
     * @returns {string|null} Current freeze state after toggle
     */
     freezeSequence() {
        if (this._freezeSequence) {
            this._freezeSequence = null;
            message("FreezeSequence Disabled", 'red');
        } else {
            this._freezeSequence = this.tvTickerToSequence();
            message(`FreezeSequence: ${this._freezeSequence}`, 'yellow');
        }
        return this._freezeSequence;
    }

    /**
     * Gets current freeze sequence state
     * @returns {string|null} Current frozen sequence or null if not frozen
     */
    getFreezeSequence() {
        return this._freezeSequence;
    }

    /**
     * Selects a timeframe based on index
     * @param {number} index - The timeframe index (0-3)
     * @returns {boolean} True if timeframe selection was successful
     * @throws {Error} If index is invalid
     */
    selectTimeframe(index) {
        try {
            // Validate index range
            if (index < 0 || index > 3) {
                throw new Error(`Invalid timeframe index: ${index}`);
            }

            const timeframe = $(`${Constants.DOM.HEADER.TIMEFRAME}:nth(${index})`);
            if (timeframe.length === 0) {
                return false;
            }

            timeframe.click();
            return true;
        } catch (error) {
            console.error('Error selecting timeframe:', error);
            return false;
        }
    }
}