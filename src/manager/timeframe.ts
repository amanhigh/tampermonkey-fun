import { Constants } from '../models/constant';
import { TimeFrame, TimeFrameConfig } from '../models/trading';
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
   * @returns Current timeframe configuration
   */
  getCurrentTimeFrameConfig(): TimeFrameConfig;
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
  private currentTimeFrame: TimeFrameConfig = Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY];

  /**
   * @param sequenceManager - Manager for sequence operations
   */
  constructor(private readonly sequenceManager: ISequenceManager) {}

  /** @inheritdoc */
  applyTimeFrame(position: number): boolean {
    const sequence = this.sequenceManager.getCurrentSequence();
    const timeFrame = this.sequenceManager.sequenceToTimeFrameConfig(sequence, position);
    this.setTimeFrame(timeFrame);
    return this.clickTimeFrameToolbar(timeFrame.toolbar);
  }

  /** @inheritdoc */
  getCurrentTimeFrameConfig(): TimeFrameConfig {
    // TODO: Timeframe based on Toolbar Selection. (Cover Non Hotkey Switches.)
    return this.currentTimeFrame;
  }

  /**
   * Click toolbar button for timeframe selection
   * @private
   * @param toolbarPosition - Position of the timeframe button in toolbar
   * @returns True if click was successful
   */
  private clickTimeFrameToolbar(toolbarPosition: number): boolean {
    const $timeframe = $(`${Constants.DOM.HEADER.TIMEFRAME}:nth(${toolbarPosition})`);
    if ($timeframe.length === 0) {
      return false;
    }
    $timeframe.click();
    return true;
  }

  /**
   * Set current timeframe without applying to chart
   * @private
   * @param timeFrame - Timeframe to set as current
   */
  private setTimeFrame(timeFrame: TimeFrameConfig): void {
    this.currentTimeFrame = timeFrame;
  }
}
