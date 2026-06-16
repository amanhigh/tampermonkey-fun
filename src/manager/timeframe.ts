import { Constants } from '../models/constant';
import {
  TimeFrameConfig,
  TickerTimeframe,
  Sequence,
  deriveSequence,
  sortTimeframesForDisplay,
} from '../models/timeframe';
import { DomainEventType } from '../models/domain_event';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IDomManager } from './dom';
import { IPublisher } from './event_bus';

/**
 * Default timeframe codes shown when backend ticker record is unavailable.
 * Matches the old MWD sequence: TMN, MN, WK, DL.
 */
const DEFAULT_TIMEFRAMES: TickerTimeframe[] = ['TMN', 'MN', 'WK', 'DL'];

/**
 * Interface for managing trading timeframe operations
 */
export interface ITimeFrameManager {
  /**
   * Apply timeframe to chart at given position in the current ticker's Sequence.
   * @param position - Position in Sequence (0-3)
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
  getExactTimeframesForCurrentTicker(): Promise<TickerTimeframe[]>;

  /**
   * Get the derived Sequence (4-tuple) for the current ticker.
   * Drops YR and other unsupported codes, sorts canonically,
   * returns exactly 4 frames from the top, or DEFAULT_SEQUENCE.
   * @returns Promise resolving to Sequence
   */
  getSequenceForCurrentTicker(): Promise<Sequence>;

  /**
   * Look up a TimeFrameConfig by its timeframe code (e.g. 'DL', 'MN').
   * @param code - Timeframe code string
   * @returns TimeFrameConfig or null if not found
   */
  getTimeFrameConfigByCode(code: string): TimeFrameConfig | null;

  /**
   * Toggle a timeframe code for the current ticker on/off in the backend.
   * If the code is already active, it is removed; if inactive, it is added.
   * Updates are persisted via TickerManager.updateTicker.
   * Publishes TICKER_TIMEFRAMES_CHANGED on success.
   * @param code - Timeframe code to toggle
   * @returns Promise resolving to the updated list of active timeframe codes
   * @throws Error if backend update fails
   */
  toggleTimeframeForCurrentTicker(code: TickerTimeframe): Promise<TickerTimeframe[]>;
}

/**
 * Manages all timeframe operations and state for trading view.
 *
 * Provides two views of ticker timeframes:
 * - **Exact**: The raw backend list (with YR if present). Used by the timeframe bar.
 * - **Sequence**: A 4-tuple derived from the top of the exact list,
 *   dropping unsupported codes like YR. Used by chart hotkeys and screenshots.
 *
 * Hotkeys 1-4 apply timeframes by position in the Sequence rather
 * than from a fixed sequence (MWD/YR).
 */
export class TimeFrameManager implements ITimeFrameManager {
  /**
   * @param tickerManager - Manager for ticker CRUD operations
   * @param domManager - Manager for DOM/ticker retrieval
   * @param publisher - Domain event publisher for notifying UI of changes
   */
  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly domManager: IDomManager,
    private readonly publisher: IPublisher
  ) {}

  /** @inheritdoc */
  async getExactTimeframesForCurrentTicker(): Promise<TickerTimeframe[]> {
    const tvTicker = this.domManager.getTicker();
    try {
      const record = await this.tickerManager.getTicker(tvTicker);
      // Sort backend timeframes in display order preserving YR
      return sortTimeframesForDisplay(record.timeframes as TickerTimeframe[]);
    } catch (error) {
      Notifier.warn(`getExactTimeframes: ${(error as Error).message}. Falling back to default timeframes.`);
      return DEFAULT_TIMEFRAMES;
    }
  }

  /** @inheritdoc */
  async getSequenceForCurrentTicker(): Promise<Sequence> {
    const tvTicker = this.domManager.getTicker();
    try {
      const record = await this.tickerManager.getTicker(tvTicker);
      return deriveSequence(record.timeframes);
    } catch (error) {
      Notifier.warn(`getSequence: ${(error as Error).message}. Falling back to default sequence.`);
      return deriveSequence([]);
    }
  }

  /** @inheritdoc */
  getTimeFrameConfigByCode(code: string): TimeFrameConfig | null {
    return Constants.TIME.FRAMES_BY_CODE[code] ?? null;
  }

  /** @inheritdoc */
  async toggleTimeframeForCurrentTicker(code: TickerTimeframe): Promise<TickerTimeframe[]> {
    const tvTicker = this.domManager.getTicker();
    const record = await this.tickerManager.getTicker(tvTicker);
    const current = record.timeframes as TickerTimeframe[];
    const isActive = current.includes(code);
    const updated = isActive ? current.filter((c) => c !== code) : [...current, code];
    const sorted = sortTimeframesForDisplay(updated);
    await this.tickerManager.updateTicker(tvTicker, { timeframes: sorted });

    // Notify subscribers that timeframes have changed
    void this.publisher.publish({
      type: DomainEventType.TICKER_TIMEFRAMES_CHANGED,
      ticker: tvTicker,
      timeframes: sorted,
    });

    return sorted;
  }

  /** @inheritdoc */
  async applyTimeFrame(position: number): Promise<boolean> {
    const sequence = await this.getSequenceForCurrentTicker();

    if (position < 0 || position >= sequence.length) {
      return false;
    }

    const code = sequence[position];
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
}
