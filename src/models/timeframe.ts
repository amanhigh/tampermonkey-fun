/**
 * Timeframe type distinguishing regular (MWD) vs annual (YR) trading views.
 *
 * - MWD:  Three-monthly, monthly, weekly, daily (typically for NSE equities)
 * - YR:   Yearly, six-monthly, three-monthly, monthly, weekly (typically for non-NSE)
 *
 * FIXME: This replaces the old SequenceType enum. Eventually rename to TradeType.
 */
export type TimeframeType = 'MWD' | 'YR';

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
 * A fixed 4-tuple of timeframe codes derived from the top of the backend
 * allowed timeframe list. Used by chart hotkeys (positions 0-3) and
 * screenshot flows.
 */
export type AppliedTimeframeTuple = readonly [TimeFrameCode, TimeFrameCode, TimeFrameCode, TimeFrameCode];

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
export function getDefaultTimeframesForExchange(exchange: string): TimeFrameCode[] {
  if (exchange.toUpperCase() === 'NSE') {
    return ['TMN', 'MN', 'WK', 'DL'];
  }
  return ['YR', 'SMN', 'TMN', 'MN', 'WK'];
}

/**
 * Derives a 4-frame applied tuple from the backend allowed timeframe list.
 *
 * Rules:
 * 1. Unsupported 'YR' codes are silently dropped
 * 2. Codes are sorted in canonical order (highest → lowest)
 * 3. The top 4 supported codes form the applied tuple
 * 4. If fewer than 4 codes remain, the tuple is padded with lower frames
 *    from the canonical set to ensure exactly 4 entries
 *
 * @param timeframes - Raw timeframe codes from backend
 * @returns Applied 4-tuple (always exactly 4 entries)
 */
export function getAppliedTimeframeTuple(timeframes: string[]): AppliedTimeframeTuple {
  // Filter to supported codes (drop YR, keep only canonical codes)
  const canonicalSet = new Set<TimeFrameCode>(CANONICAL_TIMEFRAMES as unknown as TimeFrameCode[]);
  const supported: TimeFrameCode[] = [];
  const seen = new Set<TimeFrameCode>();

  for (const code of timeframes) {
    const tfCode = code as TimeFrameCode;
    if (canonicalSet.has(tfCode) && !seen.has(tfCode)) {
      seen.add(tfCode);
      supported.push(tfCode);
    }
  }

  // Sort by canonical order (highest first) and take the top supported frame
  supported.sort((a, b) => getTimeFrameCodeIndex(a) - getTimeFrameCodeIndex(b));

  // Start from the top supported frame and take the next 4 contiguous
  // canonical frames (including the top), filling in any gaps.
  const result: TimeFrameCode[] = [];
  if (supported.length > 0) {
    const startIdx = getTimeFrameCodeIndex(supported[0]);
    if (startIdx >= 0) {
      const endIdx = Math.min(startIdx + 4, CANONICAL_TIMEFRAMES.length);
      for (let i = startIdx; i < endIdx; i++) {
        result.push(CANONICAL_TIMEFRAMES[i]);
      }
    }
  }

  // Fallback if nothing supported found
  if (result.length === 0) {
    return ['TMN', 'MN', 'WK', 'DL'] as unknown as AppliedTimeframeTuple;
  }

  return result as unknown as AppliedTimeframeTuple;
}

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
export function getLegacyJournalSequenceFromTimeframes(timeframes: string[]): 'MWD' | 'YR' {
  if (timeframes.includes('DL')) {
    return 'MWD';
  }
  return 'YR';
}

/**
 * Represents a trading timeframe configuration
 *
 * A TimeFrameConfig is a specific time period view (like Daily, Weekly, Monthly) used in trading charts.
 * Each timeframe has:
 * - A short symbol for display (e.g., "D" for Daily)
 * - A style identifier used for applying visual styles to chart elements
 * - A toolbar position that indicates which toolbar button corresponds to this timeframe
 *
 * TimeFrameConfigs are organized by code in FRAMES_BY_CODE. The applied tuple
 * (4 frames) is derived dynamically from the backend ticker timeframes.
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
