import { Constants } from '../models/constant';
import { TimeFrameConfig, TimeFrameCode, AppliedTimeframeTuple, getAppliedTimeframeTuple } from '../models/timeframe';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IDomManager } from './dom';

/**
 * Default timeframe codes shown when backend ticker record is unavailable.
 * Matches the old MWD sequence: TMN, MN, WK, DL.
 */
const DEFAULT_TIMEFRAMES: TimeFrameCode[] = ['TMN', 'MN', 'WK', 'DL'];

/**
 * Default applied tuple when backend is unreachable.
 */
const DEFAULT_APPLIED_TUPLE: AppliedTimeframeTuple = ['TMN', 'MN', 'WK', 'DL'];

/**
 * Interface for managing trading timeframe operations
 */
export interface ITimeFrameManager {
  /**
   * Apply timeframe to chart at given position in the current ticker's
   * applied 4-frame tuple.
   * @param position - Position in applied timeframes (0-3)
   * @returns True if successfully applied
   */
  applyTimeFrame(position: number): Promise<boolean>;

  /**
   * Get currently selected timeframe from the DOM toolbar.
   * @returns Current timeframe configuration
   */
  getCurrentTimeFrameConfig(): TimeFrameConfig;

  /**
   * Get the exact backend timeframe codes for the current ticker,
   * preserving YR and any other codes returned by the backend.
   * Falls back to DEFAULT_TIMEFRAMES when backend read fails.
   * @returns Promise resolving to the exact ordered list of backend timeframe codes
   */
  getExactTimeframesForCurrentTicker(): Promise<TimeFrameCode[]>;

  /**
   * Get the allowed timeframe codes for the current ticker from the backend
   * (alias for getExactTimeframesForCurrentTicker, kept for compatibility).
   * @deprecated Use getExactTimeframesForCurrentTicker instead.
   * @returns Promise resolving to ordered list of allowed timeframe codes
   */
  getAllowedTimeframesForCurrentTicker(): Promise<TimeFrameCode[]>;

  /**
   * Get the applied 4-frame tuple for the current ticker.
   * Drops YR and other unsupported codes, sorts canonically,
   * returns exactly 4 frames from the top.
   * @returns Promise resolving to applied 4-tuple
   */
  getAppliedTimeframesForCurrentTicker(): Promise<AppliedTimeframeTuple>;

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
 * Provides two views of ticker timeframes:
 * - **Exact**: The raw backend list (with YR if present). Used by the display chip.
 * - **Applied**: A 4-frame tuple derived from the top of the exact list,
 *   dropping unsupported codes like YR. Used by chart hotkeys and screenshots.
 *
 * Hotkeys 1-4 apply timeframes by position in the applied tuple rather
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
  async getExactTimeframesForCurrentTicker(): Promise<TimeFrameCode[]> {
    const tvTicker = this.domManager.getTicker();
    try {
      const record = await this.tickerManager.getTicker(tvTicker);
      // Sort backend timeframes in canonical order but preserve YR
      return record.timeframes.sort((a, b) => {
        const idxA = this.getCanonicalIndexWithYR(a);
        const idxB = this.getCanonicalIndexWithYR(b);
        return idxA - idxB;
      }) as TimeFrameCode[];
    } catch (error) {
      Notifier.warn(`getExactTimeframes: ${(error as Error).message}. Falling back to default timeframes.`);
      return DEFAULT_TIMEFRAMES;
    }
  }

  /** @inheritdoc */
  async getAllowedTimeframesForCurrentTicker(): Promise<TimeFrameCode[]> {
    return this.getExactTimeframesForCurrentTicker();
  }

  /** @inheritdoc */
  async getAppliedTimeframesForCurrentTicker(): Promise<AppliedTimeframeTuple> {
    const tvTicker = this.domManager.getTicker();
    try {
      const record = await this.tickerManager.getTicker(tvTicker);
      return getAppliedTimeframeTuple(record.timeframes);
    } catch (error) {
      Notifier.warn(`getAppliedTimeframes: ${(error as Error).message}. Falling back to default applied tuple.`);
      return DEFAULT_APPLIED_TUPLE;
    }
  }

  /** @inheritdoc */
  getTimeFrameConfigByCode(code: string): TimeFrameConfig | null {
    return Constants.TIME.FRAMES_BY_CODE[code] ?? null;
  }

  /** @inheritdoc */
  async applyTimeFrame(position: number): Promise<boolean> {
    const applied = await this.getAppliedTimeframesForCurrentTicker();

    if (position < 0 || position >= applied.length) {
      return false;
    }

    const code = applied[position];
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
      return Constants.TIME.FRAMES_BY_CODE['MN']!;
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

    return Constants.TIME.FRAMES_BY_CODE['MN']!;
  }

  /**
   * Get canonical index for sorting, including YR.
   * YR is placed before SMN in sort order.
   * @private
   * @param code - Timeframe code string
   * @returns Sort index (lower = earlier in order)
   */
  private getCanonicalIndexWithYR(code: string): number {
    const yrIdx = 0;
    const order: Record<string, number> = {
      YR: yrIdx,
      SMN: 1,
      TMN: 2,
      MN: 3,
      WK: 4,
      DL: 5,
    };
    return order[code] ?? 99;
  }
}
