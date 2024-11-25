/**
 * Represents a trading timeframe configuration
 * 
 * A TimeFrame is a specific time period view (like Daily, Weekly, Monthly) used in trading charts.
 * Each timeframe has:
 * - A short symbol for display (e.g., "D" for Daily)
 * - A style identifier used for applying visual styles to chart elements
 * - A toolbar position that indicates which toolbar button corresponds to this timeframe
 * 
 * TimeFrames are organized in sequences (MWD/YR) where each sequence defines an ordered set
 * of timeframes suitable for different trading strategies:
 * - MWD (Monthly-Weekly-Daily): Used for regular trading analysis
 * - YR (Yearly): Used for longer-term analysis
 */
class TimeFrame {
    /**
     * @param {string} symbol - Short display symbol (e.g., "D" for Daily)
     * @param {string} style - Style identifier for visual formatting
     * @param {number} toolbarPosition - Position of this timeframe in the toolbar (3-7)
     */
    constructor(symbol, style, toolbarPosition) {
        /**
         * Short symbol representing the timeframe (e.g., "D" for Daily)
         * Used in UI elements and compact displays
         * @type {string}
         */
        this.symbol = symbol;

        /**
         * Style identifier used when applying visual formatting
         * Determines how chart elements appear for this timeframe
         * @type {string}
         */
        this.style = style;

        /**
         * Position of this timeframe's button in the toolbar (ranges from 3-7)
         * Used for programmatic toolbar interactions
         * @type {number}
         */
        this.toolbar = toolbarPosition;
    }
}