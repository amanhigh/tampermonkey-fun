import {
  Timeframe,
  TickerTimeframe,
  Sequence,
  DEFAULT_SEQUENCE,
  deriveSequence,
  sortTimeframes,
  getTimeframeByCode,
  getTimeframeByToolbar,
  TIMEFRAMES,
} from '../models/timeframe';
import { Constants } from '../models/constant';
import { DomainEventType } from '../models/domain_event';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IDomManager } from './dom';
import { IPublisher } from './event_bus';

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
   * @returns Current timeframe metadata
   */
  getCurrentTimeFrameConfig(): Timeframe;

  /**
   * Get the exact backend timeframe codes for the current ticker,
   * in registry (display) order.
   * Falls back to DEFAULT_SEQUENCE when backend read fails.
   * @returns Promise resolving to the exact ordered list of backend timeframe codes
   */
  getExactTimeframesForCurrentTicker(): Promise<TickerTimeframe[]>;

  /**
   * Get the derived Sequence (4-tuple) for the current ticker.
   * Returns exactly 4 frames from the top, or DEFAULT_SEQUENCE.
   * @returns Promise resolving to Sequence
   */
  getSequenceForCurrentTicker(): Promise<Sequence>;

  /**
   * Look up timeframe metadata by its code (e.g. 'DL', 'MN').
   * @param code - Timeframe code string
   * @returns Timeframe metadata or null if not found
   */
  getTimeFrameConfigByCode(code: string): Timeframe | null;

  /**
   * Returns the default persisted timeframe list based on exchange.
   *
   * - NSE → TMN, MN, WK, DL  (MWD type)
   * - All other exchanges → YR, SMN, TMN, MN, WK  (YR type)
   *
   * Used when starting tracking for a new ticker.
   *
   * @param exchange - Exchange code (e.g. "NSE", "BSE", "NASDAQ")
   * @returns Default ordered timeframe codes for the exchange
   */
  getDefaultTimeframesForExchange(exchange: string): TickerTimeframe[];

  /**
   * Derives the legacy journal API sequence string from a list of timeframe codes.
   *
   * Current rule (simplified): if the list contains 'DL', return 'MWD';
   * otherwise return 'YR'.
   *
   * FIXME: Replace this heuristic with user-prompted selection or backend-provided type.
   *
   * @param timeframes - Timeframe codes (e.g. from screenshot images)
   * @returns 'MWD' or 'YR' for the legacy journal API
   */
  getLegacyJournalSequenceFromTimeframes(timeframes: string[]): 'MWD' | 'YR';

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
 * - **Exact**: The raw backend list sorted in registry order. Used by the timeframe bar.
 * - **Sequence**: A 4-tuple derived from the top of the sorted list.
 *   Used by chart hotkeys and screenshots.
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
      // Sort backend timeframes in registry order
      return sortTimeframes(record.timeframes as TickerTimeframe[]);
    } catch (error) {
      Notifier.warn(`getExactTimeframes: ${(error as Error).message}. Falling back to default timeframes.`);
      return [...DEFAULT_SEQUENCE];
    }
  }

  /** @inheritdoc */
  async getSequenceForCurrentTicker(): Promise<Sequence> {
    const exact = await this.getExactTimeframesForCurrentTicker();
    return deriveSequence(exact);
  }

  /** @inheritdoc */
  getTimeFrameConfigByCode(code: string): Timeframe | null {
    return getTimeframeByCode(code as TickerTimeframe) ?? null;
  }

  /** @inheritdoc */
  async toggleTimeframeForCurrentTicker(code: TickerTimeframe): Promise<TickerTimeframe[]> {
    const tvTicker = this.domManager.getTicker();
    const record = await this.tickerManager.getTicker(tvTicker);
    const current = record.timeframes as TickerTimeframe[];
    const isActive = current.includes(code);
    const updated = isActive ? current.filter((c) => c !== code) : [...current, code];
    const sorted = sortTimeframes(updated);
    await this.tickerManager.updateTicker(tvTicker, { timeframes: sorted });

    // Notify subscribers that timeframes have changed
    void this.publisher.publish({
      type: DomainEventType.TICKER_TIMEFRAMES_CHANGED,
      ticker: tvTicker,
    });

    return sorted;
  }

  /** @inheritdoc */
  getDefaultTimeframesForExchange(exchange: string): TickerTimeframe[] {
    if (exchange.toUpperCase() === 'NSE') {
      return [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL];
    }
    return TIMEFRAMES.filter((tf) => tf.code !== TickerTimeframe.DL).map((tf) => tf.code);
  }

  /** @inheritdoc */
  getLegacyJournalSequenceFromTimeframes(timeframes: string[]): 'MWD' | 'YR' {
    if (timeframes.includes('DL')) {
      return 'MWD';
    }
    return 'YR';
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
  getCurrentTimeFrameConfig(): Timeframe {
    // Find active timeframe button using aria-checked attribute
    const $activeButton = $(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);

    if ($activeButton.length === 0) {
      // Warning: Unable to detect current timeframe from DOM
      Notifier.warn('Timeframe Detection Failed - Using Monthly as Fallback');
      return getTimeframeByCode(TickerTimeframe.MN)!;
    }

    // Get index of active button
    const index = $(Constants.DOM.HEADER.TIMEFRAME).index($activeButton);

    // Map index to Timeframe metadata
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
   * Get Timeframe metadata by toolbar index
   * @private
   * @param index - Toolbar button index
   * @returns Timeframe metadata for the index
   */
  private getTimeFrameConfigByToolbarIndex(index: number): Timeframe {
    return getTimeframeByToolbar(index) ?? getTimeframeByCode(TickerTimeframe.MN)!;
  }
}
