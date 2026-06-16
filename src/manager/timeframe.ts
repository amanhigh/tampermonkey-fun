import { Constants } from '../models/constant';
import { TimeFrameConfig, TimeFrameCode, normalizeTimeframes } from '../models/trading';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IDomManager } from './dom';

/**
 * Default timeframe codes shown when backend ticker record is unavailable.
 * Matches the old MWD sequence: TMN, MN, WK, DL.
 */
const DEFAULT_TIMEFRAMES: TimeFrameCode[] = ['TMN', 'MN', 'WK', 'DL'];

/**
 * Interface for managing trading timeframe operations
 */
export interface ITimeFrameManager {
  /**
   * Apply timeframe to chart at given position in the current ticker's
   * allowed timeframe list.
   * @param position - Position in allowed timeframes (0-based)
   * @returns True if successfully applied
   */
  applyTimeFrame(position: number): Promise<boolean>;

  /**
   * Get currently selected timeframe from the DOM toolbar.
   * @returns Current timeframe configuration
   */
  getCurrentTimeFrameConfig(): TimeFrameConfig;

  /**
   * Get the allowed timeframe codes for the current ticker from the backend.
   * Falls back to DEFAULT_TIMEFRAMES when backend read fails.
   * @returns Promise resolving to ordered list of allowed timeframe codes
   */
  getAllowedTimeframesForCurrentTicker(): Promise<TimeFrameCode[]>;

  /**
   * Look up a TimeFrameConfig by its timeframe code (e.g. 'DL', 'MN').
   * @param code - Timeframe code string
   * @returns TimeFrameConfig or null if not found
   */
  getTimeFrameConfigByCode(code: string): TimeFrameConfig | null;
}

/**
 * Manages all timeframe operations and state for trading view.
 *
 * Reads allowed timeframes from the current ticker's backend record.
 * Hotkeys 1-4 apply timeframes by position in the allowed list rather
 * than from a fixed sequence (MWD/YR).
 */
export class TimeFrameManager implements ITimeFrameManager {
  /**
   * @param tickerManager - Manager for ticker CRUD operations
   * @param domManager - Manager for DOM/ticker retrieval
   */
  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly domManager: IDomManager
  ) {}

  /** @inheritdoc */
  async getAllowedTimeframesForCurrentTicker(): Promise<TimeFrameCode[]> {
    const tvTicker = this.domManager.getTicker();
    try {
      const record = await this.tickerManager.getTicker(tvTicker);
      return normalizeTimeframes(record.timeframes);
    } catch (error) {
      Notifier.warn(`getAllowedTimeframes: ${(error as Error).message}. Falling back to default timeframes.`);
      return DEFAULT_TIMEFRAMES;
    }
  }

  /** @inheritdoc */
  getTimeFrameConfigByCode(code: string): TimeFrameConfig | null {
    return Constants.TIME.FRAMES_BY_CODE[code] ?? null;
  }

  /** @inheritdoc */
  async applyTimeFrame(position: number): Promise<boolean> {
    const allowed = await this.getAllowedTimeframesForCurrentTicker();

    if (position < 0 || position >= allowed.length) {
      return false;
    }

    const code = allowed[position];
    const config = this.getTimeFrameConfigByCode(code);
    if (!config) {
      return false;
    }

    return this.clickTimeFrameToolbar(config.toolbar);
  }

  /** @inheritdoc */
  getCurrentTimeFrameConfig(): TimeFrameConfig {
    // Find active timeframe button using aria-checked attribute
    const $activeButton = $(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);

    if ($activeButton.length === 0) {
      // Warning: Unable to detect current timeframe from DOM
      Notifier.warn('Timeframe Detection Failed - Using Monthly as Fallback');
      return Constants.TIME.FRAMES_BY_CODE['MN'] ?? Object.values(Constants.TIME.SEQUENCE_TYPES.FRAMES)[0];
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
    // Search through FRAMES_BY_CODE values
    for (const config of Object.values(Constants.TIME.FRAMES_BY_CODE)) {
      if (config.toolbar === index) {
        return config;
      }
    }

    return Constants.TIME.FRAMES_BY_CODE['MN'] ?? Object.values(Constants.TIME.SEQUENCE_TYPES.FRAMES)[0];
  }
}
