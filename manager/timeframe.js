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
class TimeFrameManager {
    /**
     * Creates a TimeFrameManager instance
     */
    constructor() {
        this._currentTimeFrame = null;
    }

    /**
     * Get timeframe configuration based on sequence and position
     * @param {string} sequence - Sequence type (MWD/YR)
     * @param {number} position - Position in sequence (0-3)
     * @returns {TimeFrame|null} Timeframe configuration
     */
    getTimeFrame(sequence, position) {
        try {
            const timeFrameName = Constants.TIME.SEQUENCES[sequence][position];
            if (!timeFrameName) return null;
            return Constants.TIME.FRAMES[timeFrameName];
        } catch (error) {
            console.error('Error getting timeframe:', error);
            return null;
        }
    }

    /**
     * Set current timeframe without applying to chart
     * @param {TimeFrame} timeFrame - Timeframe to set as current
     */
    setTimeFrame(timeFrame) {
        this._currentTimeFrame = timeFrame;
    }

    /**
     * Apply timeframe to chart and set as current
     * @param {string} sequence - Sequence type (MWD/YR)
     * @param {number} position - Position in sequence (0-3)
     * @returns {boolean} True if successfully applied
     */
    applyTimeFrame(sequence, position) {
        try {
            const timeFrame = this.getTimeFrame(sequence, position);
            if (!timeFrame) {
                throw new Error(`Invalid timeframe for sequence ${sequence} and position ${position}`);
            }
            this.setTimeFrame(timeFrame);
            return this._clickTimeFrameToolbar(timeFrame.toolbarPosition);
        } catch (error) {
            console.error('Error applying timeframe:', error);
            return false;
        }
    }

    /**
     * Get currently selected timeframe
     * @returns {TimeFrame|null} Current timeframe configuration
     */
    getCurrentTimeFrame() {
        return this._currentTimeFrame;
    }

    /**
     * Click toolbar button for timeframe selection
     * @private
     * @param {number} toolbarPosition - Position of the timeframe button in toolbar
     * @returns {boolean} True if click was successful
     */
    _clickTimeFrameToolbar(toolbarPosition) {
        try {
            const $timeframe = $(`${Constants.DOM.HEADER.TIMEFRAME}:nth(${toolbarPosition})`);
            if ($timeframe.length === 0) return false;
            $timeframe.click();
            return true;
        } catch (error) {
            console.error('Error clicking timeframe toolbar:', error);
            return false;
        }
    }
}