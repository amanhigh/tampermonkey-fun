/**
 * Configuration for sequence operations
 * @class SequenceConfig
 */
class SequenceConfig {
    /**
     * Sequence types
     * @type {Object}
     */
    static SEQUENCE = Object.freeze({
        // Monthly-Weekly-Daily sequence
        DEFAULT: 'MWD',
        // Yearly-Range sequence
        HIGH: 'YR'
    });

    /**
     * Time frame configurations
     * @type {Object}
     */
    static TIME_FRAME = Object.freeze({
        DAILY: { index: 3, symbol: "D", style: "I" },
        WEEKLY: { index: 4, symbol: "WK", style: "H" },
        MONTHLY: { index: 5, symbol: "MN", style: "VH" },
        THREE_MONTHLY: { index: 6, symbol: "TMN", style: "T" },
        SIX_MONTHLY: { index: 7, symbol: "SMN", style: "I" }
    });

    /**
     * Time frame bar configurations
     * @type {Object}
     */
    static TIME_FRAME_BAR = Object.freeze({
        // Monthly-Weekly-Daily sequence
        'MWD': [
            SequenceConfig.TIME_FRAME.THREE_MONTHLY,
            SequenceConfig.TIME_FRAME.MONTHLY,
            SequenceConfig.TIME_FRAME.WEEKLY,
            SequenceConfig.TIME_FRAME.DAILY
        ],
        // Yearly-Range sequence
        'YR': [
            SequenceConfig.TIME_FRAME.SIX_MONTHLY,
            SequenceConfig.TIME_FRAME.THREE_MONTHLY,
            SequenceConfig.TIME_FRAME.MONTHLY,
            SequenceConfig.TIME_FRAME.WEEKLY
        ]
    });
}

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
        return exchange === Constants.SELECTORS.EXCHANGE.NSE 
            ? SequenceConfig.SEQUENCE.DEFAULT  // MWD
            : SequenceConfig.SEQUENCE.HIGH;    // YR
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
        const sequence = currentSequence === SequenceConfig.SEQUENCE.HIGH 
            ? SequenceConfig.SEQUENCE.DEFAULT  // MWD
            : SequenceConfig.SEQUENCE.HIGH;    // YR
        
        this._sequenceRepo.pinSequence(tvTicker, sequence);
    }

    /**
     * Maps sequence and index to timeframe configuration
     * @param {string} sequence Sequence type (MWD or YR)
     * @param {number} timeFrameIndex The index of the time frame (0-3)
     * @returns {Object} Timeframe configuration containing index, symbol, and style
     */
    sequenceToTimeFrame(sequence, timeFrameIndex) {
        return SequenceConfig.TIME_FRAME_BAR[sequence][timeFrameIndex];
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
}