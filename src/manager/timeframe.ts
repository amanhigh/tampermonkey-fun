import { Timeframe, TickerTimeframe, Sequence, TMN_SEQUENCE, SMN_SEQUENCE } from '../models/timeframe';
import { Constants } from '../models/constant';
import { DomainEventType } from '../models/domain_event';
import { Notifier } from '../util/notify';
import { ITickerManager } from './ticker';
import { IDomManager } from './dom';
import { IPublisher } from './event_bus';

// ── Catalog & Lookups ──
// Ordered catalog of all timeframe metadata with pre-built lookup maps.
// Single source of truth for ranking, toolbar position, style, and display order.

const TIMEFRAMES: readonly Timeframe[] = [
  { code: TickerTimeframe.YR, label: '12M', rank: 0, toolbar: 7, style: 'H' },
  { code: TickerTimeframe.SMN, label: '6M', rank: 1, toolbar: 6, style: 'I' },
  { code: TickerTimeframe.TMN, label: '3M', rank: 2, toolbar: 5, style: 'T' },
  { code: TickerTimeframe.MN, label: 'M', rank: 3, toolbar: 4, style: 'VH' },
  { code: TickerTimeframe.WK, label: 'W', rank: 4, toolbar: 3, style: 'H' },
  { code: TickerTimeframe.DL, label: 'D', rank: 5, toolbar: 2, style: 'I' },
];

const TIMEFRAME_BY_CODE: ReadonlyMap<TickerTimeframe, Timeframe> = new Map(TIMEFRAMES.map((tf) => [tf.code, tf]));
const TIMEFRAME_BY_TOOLBAR: ReadonlyMap<number, Timeframe> = new Map(TIMEFRAMES.map((tf) => [tf.toolbar, tf]));

/**
 * Filters timeframe codes to only those in the catalog, preserving catalog order.
 * Unknown/invalid codes are silently dropped.
 */
function toSupportedTimeframes(codes: TickerTimeframe[]): Timeframe[] {
  const active = new Set(codes);
  return TIMEFRAMES.filter((tf) => active.has(tf.code));
}

// ── Public Interface ──
// Methods are named without "forCurrentTicker" suffix because the manager
// always operates on the current TradingView ticker.

export interface ITimeFrameManager {
  /** Returns the active backend timeframe codes for the current ticker,
   * sorted by catalog order. Falls back to TMN_SEQUENCE when backend
   * read fails. */
  getActiveTimeframes(): Promise<readonly TickerTimeframe[]>;

  /** Toggle a timeframe code for the current ticker on/off in the backend.
   * Publishes TICKER_TIMEFRAMES_CHANGED on success.
   * @throws Error if backend update fails */
  toggleTimeframe(code: TickerTimeframe): Promise<TickerTimeframe[]>;

  /** Get the derived Sequence (4-tuple) for the current ticker.
   * Selects TMN_SEQUENCE or SMN_SEQUENCE based on whether the ticker's
   * allowed timeframes include DL:
   *   - Empty/unsupported list → TMN_SEQUENCE (TMN, MN, WK, DL)
   *   - Contains DL            → TMN_SEQUENCE (TMN, MN, WK, DL)
   *   - Otherwise              → SMN_SEQUENCE (SMN, TMN, MN, WK) */
  getSequence(): Promise<Sequence>;

  /** Apply timeframe to chart at given position in the current ticker's Sequence.
   * @param position - Position in Sequence (0-3)
   * @returns True if successfully applied */
  apply(position: number): Promise<boolean>;

  /** Get currently selected timeframe from the DOM toolbar.
   * @returns Current timeframe metadata */
  getCurrentConfig(): Timeframe;
}

// ── Manager Implementation ──

/**
 * Manages all timeframe operations and state for trading view.
 *
 * Owns the timeframe catalog (codes, labels, ranks, toolbar positions, styles),
 * sequence derivation, and default timeframe policies.
 *
 * The Sequence is derived from the ticker's allowed timeframes:
 *   - Contains DL → TMN_SEQUENCE (TMN, MN, WK, DL)
 *   - Otherwise  → SMN_SEQUENCE (SMN, TMN, MN, WK)
 *   - Fallback    → TMN_SEQUENCE (TMN, MN, WK, DL)
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

  // ── Backend Operations ──

  /** @inheritdoc */
  async getActiveTimeframes(): Promise<readonly TickerTimeframe[]> {
    const tvTicker = this.domManager.getTicker();
    try {
      const record = await this.tickerManager.getTicker(tvTicker);
      const active = toSupportedTimeframes(record.timeframes as TickerTimeframe[]);
      return active.map((tf) => tf.code);
    } catch (error) {
      Notifier.warn(`getActiveTimeframes: ${(error as Error).message}. Falling back to default timeframes.`);
      return [...TMN_SEQUENCE];
    }
  }

  /** @inheritdoc */
  async toggleTimeframe(code: TickerTimeframe): Promise<TickerTimeframe[]> {
    const tvTicker = this.domManager.getTicker();
    const record = await this.tickerManager.getTicker(tvTicker);
    const current = record.timeframes as TickerTimeframe[];
    const isActive = current.includes(code);
    const updated = isActive ? current.filter((c) => c !== code) : [...current, code];
    const active = toSupportedTimeframes(updated);
    const sorted = active.map((tf) => tf.code);
    await this.tickerManager.updateTicker(tvTicker, { timeframes: sorted });

    void this.publisher.publish({
      type: DomainEventType.TICKER_TIMEFRAMES_CHANGED,
      ticker: tvTicker,
    });

    return sorted;
  }

  /** @inheritdoc */
  async getSequence(): Promise<Sequence> {
    const codes = await this.getActiveTimeframes();
    if (codes.length === 0 || codes.includes(TickerTimeframe.DL)) {
      return TMN_SEQUENCE;
    }
    // FIXME: YR_SEQUENCE not yet supported — add yearly-aware cycle when needed
    return SMN_SEQUENCE;
  }

  // ── DOM Operations ──

  /** @inheritdoc */
  async apply(position: number): Promise<boolean> {
    const sequence = await this.getSequence();
    if (position < 0 || position >= sequence.length) {
      return false;
    }
    const code = sequence[position];
    const config = TIMEFRAME_BY_CODE.get(code);
    if (!config) {
      return false;
    }
    return this.clickTimeFrameToolbar(config.toolbar);
  }

  /** @inheritdoc */
  getCurrentConfig(): Timeframe {
    const $activeButton = $(`${Constants.DOM.HEADER.TIMEFRAME}[aria-checked="true"]`);

    if ($activeButton.length === 0) {
      Notifier.warn('Timeframe Detection Failed - Using Monthly as Fallback');
      return TIMEFRAME_BY_CODE.get(TickerTimeframe.MN)!;
    }

    const index = $(Constants.DOM.HEADER.TIMEFRAME).index($activeButton);
    return TIMEFRAME_BY_TOOLBAR.get(index) ?? TIMEFRAME_BY_CODE.get(TickerTimeframe.MN)!;
  }

  // ── Private Helpers ──

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
