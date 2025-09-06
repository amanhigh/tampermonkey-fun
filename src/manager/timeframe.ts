import { Constants } from '../models/constant';
import { TimeFrame, TimeFrameConfig } from '../models/trading';
import { ISequenceManager } from './sequence';
import { Notifier } from '../util/notify';

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
   * @param sequenceManager - Manager for sequence operations
   */
  constructor(private readonly sequenceManager: ISequenceManager) {}

  /** @inheritdoc */
  applyTimeFrame(position: number): boolean {
    const sequence = this.sequenceManager.getCurrentSequence();
    const timeFrame = this.sequenceManager.sequenceToTimeFrameConfig(sequence, position);
    return this.clickTimeFrameToolbar(timeFrame.toolbar);
  }

  /** @inheritdoc */
  getCurrentTimeFrameConfig(): TimeFrameConfig {
    // Find active timeframe button using aria-checked attribute
    const $activeButton = $(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);

    if ($activeButton.length === 0) {
      // Warning: Unable to detect current timeframe from DOM
      Notifier.warn('Timeframe Detection Failed - Using Monthly as Fallback');
      return Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY];
    }

    // Get index of active button
    const index = $(Constants.DOM.HEADER.TIMEFRAME).index($activeButton);

    // Map index to TimeFrameConfig
    return this.getTimeFrameConfigByToolbarIndex(index);
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
   * Get TimeFrameConfig by toolbar index
   * @private
   * @param index - Toolbar button index
   * @returns TimeFrameConfig for the index
   */
  private getTimeFrameConfigByToolbarIndex(index: number): TimeFrameConfig {
    for (const config of Object.values(Constants.TIME.SEQUENCE_TYPES.FRAMES)) {
      if (config.toolbar === index) {
        return config;
      }
    }

    return Constants.TIME.SEQUENCE_TYPES.FRAMES[TimeFrame.MONTHLY];
  }
}
