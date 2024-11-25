/**
 * Manages sequence operations and state for trading view timeframes
 */
class SequenceManager {
    /**
     * @param {SequenceRepo} sequenceRepo - Repository for sequence operations
     * @param {TradingViewManager} tvManager - Trading view manager
     */
    constructor(sequenceRepo, tvManager) {
        this._sequenceRepo = sequenceRepo;
        this._tvManager = tvManager;
        this._freezeSequence = null;
    }

    /**
     * Gets current sequence considering freeze state
     * @returns {string} Sequence type (MWD or YR)
     */
    getCurrentSequence() {
        // Return frozen sequence if exists
        if (this._freezeSequence) {
            return this._freezeSequence;
        }

        const ticker = this._tvManager.getTicker();
        const exchange = this._tvManager.getExchange();
        const defaultSequence = this._getDefaultSequence(exchange);
        
        return this._sequenceRepo.getSequence(ticker, defaultSequence);
    }

    /**
     * Flips current ticker's sequence between MWD and YR
     */
    flipSequence() {
        const tvTicker = this._tvManager.getTicker();
        const currentSequence = this.getCurrentSequence();
        
        const sequence = currentSequence === Constants.TIME.SEQUENCE_TYPES.HIGH 
            ? Constants.TIME.SEQUENCE_TYPES.DEFAULT 
            : Constants.TIME.SEQUENCE_TYPES.HIGH;
        
        this._sequenceRepo.pinSequence(tvTicker, sequence);
    }

    /**
     * Get timeframe for given sequence and index
     * @param {string} sequence - Sequence type (MWD/YR)
     * @param {number} position - Position in sequence (0-3)
     * @returns {TimeFrame|null} TimeFrame configuration
     */
    sequenceToTimeFrame(sequence, position) {
        try {
            const timeFrameName = Constants.TIME.SEQUENCES[sequence][position];
            if (!timeFrameName) return null;
            const config = Constants.TIME.FRAMES[timeFrameName];
            return new TimeFrame(config.symbol, config.style, config.toolbarPosition);
        } catch (error) {
            console.error('Error getting timeframe:', error);
            return null;
        }
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
     * Get default sequence based on exchange
     * @private
     * @param {string} exchange - Exchange identifier
     * @returns {string} Default sequence (MWD or YR)
     */
    _getDefaultSequence(exchange) {
        return exchange === Constants.EXCHANGE.TYPES.NSE
            ? Constants.TIME.SEQUENCE_TYPES.DEFAULT  // MWD
            : Constants.TIME.SEQUENCE_TYPES.HIGH;    // YR
    }
}