import { Timeframe, TickerTimeframe, Sequence } from '../models/timeframe';
import { Constants } from '../models/constant';
import { DomainEventType } from '../models/domain_event';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IDomManager } from './dom';
import { IPublisher } from './event_bus';

// ── Timeframe Catalog ──
// Ordered catalog of all timeframe metadata. Used as the single source of truth
// for ranking, toolbar position, style, and display order.

const SEQUENCE_LENGTH = 4;

const DEFAULT_SEQUENCE: Sequence = [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL];

const TIMEFRAMES: readonly Timeframe[] = [
  { code: TickerTimeframe.YR, label: '12M', rank: 0, toolbar: 7, style: 'H' },
  { code: TickerTimeframe.SMN, label: '6M', rank: 1, toolbar: 6, style: 'I' },
  { code: TickerTimeframe.TMN, label: '3M', rank: 2, toolbar: 5, style: 'T' },
  { code: TickerTimeframe.MN, label: 'M', rank: 3, toolbar: 4, style: 'VH' },
  { code: TickerTimeframe.WK, label: 'W', rank: 4, toolbar: 3, style: 'H' },
  { code: TickerTimeframe.DL, label: 'D', rank: 5, toolbar: 2, style: 'I' },
];

// ── Public Interface ──
// Grouped by consumer workflow:
//   1. Catalog/read policy — static metadata and defaults
//   2. Backend active state — read/write the persistent ticker timeframe list
//   3. Sequence and chart application — derive 4-tuple and apply via toolbar
//   4. DOM current timeframe detection — detect currently selected toolbar button

export interface ITimeFrameManager {
  // ── 1.0 Catalog / Read Policy ──

  /**
   * Returns all timeframe codes in catalog order.
   * Used by the timeframe handler for rendering chips.
   */
  getTimeframeCodes(): readonly TickerTimeframe[];

  /**
   * Returns the default persisted timeframe list based on exchange.
   *
   * - NSE → TMN, MN, WK, DL
   * - All other exchanges → YR, SMN, TMN, MN, WK
   *
   * Used when starting tracking for a new ticker.
   */
  getDefaultTimeframesForExchange(exchange: string): TickerTimeframe[];

  // ── 2.0 Backend Active State ──

  /**
   * Returns the active backend timeframe codes for the current ticker,
   * sorted by catalog order.
   * Falls back to DEFAULT_SEQUENCE when backend read fails.
   */
  getActiveTimeframesForCurrentTicker(): Promise<readonly TickerTimeframe[]>;

  /**
   * Toggle a timeframe code for the current ticker on/off in the backend.
   * Publishes TICKER_TIMEFRAMES_CHANGED on success.
   * @throws Error if backend update fails
   */
  toggleTimeframeForCurrentTicker(code: TickerTimeframe): Promise<TickerTimeframe[]>;

  // ── 3.0 Sequence and Chart Application ──

  /**
   * Get the derived Sequence (4-tuple) for the current ticker.
   * Returns exactly 4 frames from the top, or DEFAULT_SEQUENCE.
   */
  getSequenceForCurrentTicker(): Promise<Sequence>;

  /**
   * Apply timeframe to chart at given position in the current ticker's Sequence.
   * @param position - Position in Sequence (0-3)
   * @returns True if successfully applied
   */
  applyTimeFrame(position: number): Promise<boolean>;

  // ── 4.0 DOM Current Timeframe Detection ──

  /**
   * Get currently selected timeframe from the DOM toolbar.
   * @returns Current timeframe metadata
   */
  getCurrentTimeFrameConfig(): Timeframe;
}

// ── Manager Implementation ──

/**
 * Manages all timeframe operations and state for trading view.
 *
 * Owns the timeframe catalog (codes, labels, ranks, toolbar positions, styles),
 * sequence derivation, and default timeframe policies.
 *
 * Hotkeys 1-4 apply timeframes by position in the derived Sequence
 * rather than from a fixed sequence.
 */
export class TimeFrameManager implements ITimeFrameManager {
  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly domManager: IDomManager,
    private readonly publisher: IPublisher
  ) {}

  // ── 1.0 Catalog / Read Policy ──

  /** @inheritdoc */
  getTimeframeCodes(): readonly TickerTimeframe[] {
    return TIMEFRAMES.map((tf) => tf.code);
  }

  /** @inheritdoc */
  getDefaultTimeframesForExchange(exchange: string): TickerTimeframe[] {
    if (exchange.toUpperCase() === 'NSE') {
      return [TickerTimeframe.TMN, TickerTimeframe.MN, TickerTimeframe.WK, TickerTimeframe.DL];
    }
    return TIMEFRAMES.filter((tf) => tf.code !== TickerTimeframe.DL).map((tf) => tf.code);
  }

  // ── 2.0 Backend Active State ──

  /** @inheritdoc */
  async getActiveTimeframesForCurrentTicker(): Promise<readonly TickerTimeframe[]> {
    const tvTicker = this.domManager.getTicker();
    try {
      const record = await this.tickerManager.getTicker(tvTicker);
      const active = this.getActiveTimeframes(record.timeframes as TickerTimeframe[]);
      return active.map((tf) => tf.code);
    } catch (error) {
      Notifier.warn(`getActiveTimeframes: ${(error as Error).message}. Falling back to default timeframes.`);
      return [...DEFAULT_SEQUENCE];
    }
  }

  /** @inheritdoc */
  async toggleTimeframeForCurrentTicker(code: TickerTimeframe): Promise<TickerTimeframe[]> {
    const tvTicker = this.domManager.getTicker();
    const record = await this.tickerManager.getTicker(tvTicker);
    const current = record.timeframes as TickerTimeframe[];
    const isActive = current.includes(code);
    const updated = isActive ? current.filter((c) => c !== code) : [...current, code];
    const active = this.getActiveTimeframes(updated);
    const sorted = active.map((tf) => tf.code);
    await this.tickerManager.updateTicker(tvTicker, { timeframes: sorted });

    void this.publisher.publish({
      type: DomainEventType.TICKER_TIMEFRAMES_CHANGED,
      ticker: tvTicker,
    });

    return sorted;
  }

  // ── 3.0 Sequence and Chart Application ──

  /** @inheritdoc */
  async getSequenceForCurrentTicker(): Promise<Sequence> {
    const active = await this.getActiveTimeframesForCurrentTicker();
    return this.deriveSequence(active as TickerTimeframe[]);
  }

  /** @inheritdoc */
  async applyTimeFrame(position: number): Promise<boolean> {
    const sequence = await this.getSequenceForCurrentTicker();

    if (position < 0 || position >= sequence.length) {
      return false;
    }

    const code = sequence[position];
    const config = this.findTimeframeByCode(code);
    if (!config) {
      return false;
    }

    return this.clickTimeFrameToolbar(config.toolbar);
  }

  // ── 4.0 DOM Current Timeframe Detection ──

  /** @inheritdoc */
  getCurrentTimeFrameConfig(): Timeframe {
    const $activeButton = $(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);

    if ($activeButton.length === 0) {
      Notifier.warn('Timeframe Detection Failed - Using Monthly as Fallback');
      return this.findTimeframeByCode(TickerTimeframe.MN)!;
    }

    const index = $(Constants.DOM.HEADER.TIMEFRAME).index($activeButton);
    return this.findTimeframeByToolbar(index) ?? this.findTimeframeByCode(TickerTimeframe.MN)!;
  }

  // ── Private Catalog Helpers ──

  /**
   * Filters timeframe codes to only those in the catalog, preserving catalog order.
   * Unknown/invalid codes are silently dropped.
   */
  private getActiveTimeframes(codes: TickerTimeframe[]): Timeframe[] {
    const active = new Set(codes);
    return TIMEFRAMES.filter((tf) => active.has(tf.code));
  }

  /**
   * Returns the timeframe metadata for the given code, or undefined if not found.
   */
  private findTimeframeByCode(code: TickerTimeframe): Timeframe | undefined {
    return TIMEFRAMES.find((tf) => tf.code === code);
  }

  /**
   * Returns the timeframe metadata for the given toolbar index, or undefined if not found.
   */
  private findTimeframeByToolbar(toolbar: number): Timeframe | undefined {
    return TIMEFRAMES.find((tf) => tf.toolbar === toolbar);
  }

  // ── Private Sequence Helpers ──

  /**
   * Derives a 4-frame Sequence from an ordered array of timeframe codes.
   *
   * Rules:
   * 1. Only codes in the catalog are kept (others dropped)
   * 2. Codes are ordered by catalog rank
   * 3. The highest-ranked timeframe is used as the start
   * 4. If start + 4 contiguous catalog entries fit, that 4-tuple is returned
   * 5. Otherwise DEFAULT_SEQUENCE is returned
   */
  private deriveSequence(codes: TickerTimeframe[]): Sequence {
    const supported = this.getActiveTimeframes(codes);

    if (supported.length === 0) {
      return DEFAULT_SEQUENCE;
    }

    const startIdx = TIMEFRAMES.findIndex((tf) => tf.code === supported[0].code);
    if (startIdx < 0 || startIdx + SEQUENCE_LENGTH > TIMEFRAMES.length) {
      return DEFAULT_SEQUENCE;
    }

    return TIMEFRAMES.slice(startIdx, startIdx + SEQUENCE_LENGTH).map((tf) => tf.code) as unknown as Sequence;
  }

  // ── Private DOM Helpers ──

  /**
   * Click toolbar button for timeframe selection.
   */
  private clickTimeFrameToolbar(toolbarPosition: number): boolean {
    const $timeframe = $(`${Constants.DOM.HEADER.TIMEFRAME}:nth(${toolbarPosition})`);
    if ($timeframe.length === 0) {
      return false;
    }
    $timeframe.click();
    return true;
  }
}
