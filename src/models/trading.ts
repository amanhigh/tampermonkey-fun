/**
 * Available sequence types for timeframe analysis
 *
 * FIXME: Rename to TimeframeSet — "sequence" is a legacy concept
 * to be replaced everywhere (manager, handler, Constants, UI).
 */
export enum SequenceType {
  /** Monthly-Weekly-Daily sequence for regular trading */
  MWD = 'MWD',
  /** Yearly sequence for longer-term analysis */
  YR = 'YR',
}

/**
 * Available trend types for journal entries
 */
export enum Trend {
  /** Normal trend movement */
  TREND = 'trend',
  /** Counter trend movement */
  COUNTER_TREND = 'ctrend',
}

/**
 * Available journal entry types
 **/
export enum JournalType {
  SET = 'set',
  RESULT = 'result',
  REJECTED = 'rejected',
}

/**
 * Available timeframe keys
 */
export enum TimeFrame {
  /** Daily timeframe */
  DAILY = 'DAILY',
  /** Weekly timeframe */
  WEEKLY = 'WEEKLY',
  /** Monthly timeframe */
  MONTHLY = 'MONTHLY',
  /** Three month timeframe */
  THREE_MONTHLY = 'THREE_MONTHLY',
  /** Six month timeframe */
  SIX_MONTHLY = 'SIX_MONTHLY',
  // FIXME: Add YEARLY = 'YEARLY' support.
  // TradingView toolbar supports 12M (toolbar index 7),
  // but frontend TimeFrameConfig does not define it yet.
  // Once added, update CANONICAL_TIMEFRAMES to include 'YR'.
}

/**
 * Backend timeframe code — mirrors TickerTimeframe from ticker.ts
 * to avoid circular dependency.
 *
 * Ordered from highest (longest) to lowest (shortest):
 * YR > SMN > TMN > MN > WK > DL
 *
 * FIXME: Unify with TickerTimeframe in ticker.ts.
 */
export type TimeFrameCode = 'YR' | 'SMN' | 'TMN' | 'MN' | 'WK' | 'DL';

/**
 * Canonical ordering of supported timeframe codes, highest to lowest.
 *
 * NOTE: YR is listed here for completeness but is NOT yet wired in
 * frontend TimeFrameConfig / toolbar. Code that uses this array must
 * filter YR out until YEARLY enum support is added.
 *
 * FIXME: Include 'YR' once TimeFrame.YEARLY config exists.
 */
export const CANONICAL_TIMEFRAMES: readonly TimeFrameCode[] = ['SMN', 'TMN', 'MN', 'WK', 'DL'] as const;

/**
 * Returns the index of a timeframe code within the canonical order.
 * @param code - Timeframe code to look up
 * @returns Index in CANONICAL_TIMEFRAMES, or -1 if not found
 */
export function getTimeFrameCodeIndex(code: TimeFrameCode): number {
  return CANONICAL_TIMEFRAMES.indexOf(code);
}

/**
 * Filters a list of timeframe codes to only those in the canonical set,
 * preserving the canonical order (highest to lowest). Codes not in
 * CANONICAL_TIMEFRAMES (e.g. 'YR') are silently dropped.
 *
 * FIXME: Once YR support is added, update CANONICAL_TIMEFRAMES and
 * this function will include YR automatically.
 *
 * @param codes - Raw timeframe codes from backend or config
 * @returns Filtered and sorted list of supported codes
 */
export function normalizeTimeframes(codes: string[]): TimeFrameCode[] {
  const valid = new Set<TimeFrameCode>(CANONICAL_TIMEFRAMES as unknown as TimeFrameCode[]);
  const seen = new Set<TimeFrameCode>();
  const result: TimeFrameCode[] = [];

  for (const code of codes) {
    const tfCode = code as TimeFrameCode;
    if (valid.has(tfCode) && !seen.has(tfCode)) {
      seen.add(tfCode);
      result.push(tfCode);
    }
  }

  // Sort by canonical order (highest first)
  return result.sort((a, b) => CANONICAL_TIMEFRAMES.indexOf(a) - CANONICAL_TIMEFRAMES.indexOf(b));
}

/**
 * Returns the preferred timeframe codes starting from the current active
 * timeframe, for order placement use cases.
 *
 * Rule: current + next 3 lower timeframes = 4 total.
 *
 * Returns `null` when the current timeframe is too low (MN, WK, DL) to
 * produce 4 meaningful timeframes for order placement.
 *
 * @param currentCode - The currently active timeframe code
 * @returns Array of 4 timeframe codes, or null if invalid for order
 */
export function getOrderPreferredTimeframes(currentCode: TimeFrameCode): TimeFrameCode[] | null {
  const currentIdx = CANONICAL_TIMEFRAMES.indexOf(currentCode);
  if (currentIdx === -1 || currentIdx > 2) {
    // Position 0=SMN(valid), 1=TMN(valid), 2=MN(invalid), 3=WK(invalid), 4=DL(invalid)
    return null;
  }

  // Valid start: YR(0), SMN(1), TMN(2) → return 4 frames
  // But since YR is deferred, valid starts are SMN(idx=0) and TMN(idx=1)
  // FIXME: When YR is added at index 0, adjust: YR(0), SMN(1), TMN(2)
  return CANONICAL_TIMEFRAMES.slice(currentIdx, currentIdx + 4) as TimeFrameCode[];
}

/**
 * Mapping of sequence types to ordered timeframe keys
 */
export interface SequenceMap {
  [SequenceType.MWD]: TimeFrame[];
  [SequenceType.YR]: TimeFrame[];
}

/**
 * Timeframe configuration mapping
 */
export type TimeFrameMap = Record<TimeFrame, TimeFrameConfig>;

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
export class TimeFrameConfig {
  constructor(
    private _symbol: string,
    private _style: string,
    private _toolbar: number
  ) {}

  get symbol(): string {
    return this._symbol;
  }

  get style(): string {
    return this._style;
  }

  get toolbar(): number {
    return this._toolbar;
  }

  set symbol(value: string) {
    this._symbol = value;
  }

  set style(value: string) {
    this._style = value;
  }

  set toolbar(value: number) {
    this._toolbar = value;
  }
}
