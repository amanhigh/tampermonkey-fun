import { Constants } from '../models/constant';
import { TimeFrame } from '../models/trading';
import { ISequenceManager } from './sequence';

/**
 * Interface for managing trading timeframe operations
 */
export interface ITimeFrameManager {
    /**
     * Apply timeframe to chart and set as current
     * @param position - Position in sequence (0-3)
     * @returns True if successfully applied
     */
    applyTimeFrame(position: number): boolean;

    /**
     * Get currently selected timeframe
     * @returns Current timeframe configuration or null
     */
    getCurrentTimeFrame(): TimeFrame | null;
}

/**
 * Manages all timeframe operations and state for trading view
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
export class TimeFrameManager implements ITimeFrameManager {
    /**
     * Currently selected timeframe
     * @private
     */
    private _currentTimeFrame: TimeFrame | null = null;

    /**
     * @param sequenceManager - Manager for sequence operations
     */
    constructor(
        private readonly _sequenceManager: ISequenceManager
    ) {}

    /** @inheritdoc */
    applyTimeFrame(position: number): boolean {
        try {
            const sequence = this._sequenceManager.getCurrentSequence();
            const timeFrame = this._sequenceManager.sequenceToTimeFrame(sequence, position);
            if (!timeFrame) {
                throw new Error(`Invalid timeframe for sequence ${sequence} and position ${position}`);
            }
            this._setTimeFrame(timeFrame);
            return this._clickTimeFrameToolbar(timeFrame.toolbar);
        } catch (error) {
            console.error('Error applying timeframe:', error);
            return false;
        }
    }

    /** @inheritdoc */
    getCurrentTimeFrame(): TimeFrame | null {
        return this._currentTimeFrame;
    }

    /**
     * Click toolbar button for timeframe selection
     * @private
     * @param toolbarPosition - Position of the timeframe button in toolbar
     * @returns True if click was successful
     */
    private _clickTimeFrameToolbar(toolbarPosition: number): boolean {
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

    /**
     * Set current timeframe without applying to chart
     * @private
     * @param timeFrame - Timeframe to set as current
     */
    private _setTimeFrame(timeFrame: TimeFrame): void {
        this._currentTimeFrame = timeFrame;
    }
}
