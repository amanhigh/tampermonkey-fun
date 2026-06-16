// ── Shared timeframe code type ──
// Defined here (not in ticker.ts) to avoid circular dependency:
// ticker.ts → constant.ts → timeframe.ts
// timeframe.ts must not import from ticker.ts or constant.ts.

/**
 * Ordered timeframe codes representing TradingView interval presets.
 * Mirrors the Go backend model in barkat/ticker.go.
 */
export type TickerTimeframe = 'YR' | 'SMN' | 'TMN' | 'MN' | 'WK' | 'DL';

/**
 * Canonical ordering of supported timeframe codes, highest to lowest.

/**
 * Canonical ordering of supported timeframe codes, highest to lowest.
 *
 * NOTE: YR is listed in DISPLAY_TIMEFRAMES for the timeframe bar but is
 * NOT yet wired in frontend TimeFrameConfig / toolbar. Code that derives
 * a Sequence must filter YR out until a config entry exists.
 *
 * FIXME: Include 'YR' once TimeFrameConfig for yearly is defined in FRAMES_BY_CODE.
 */
export const CANONICAL_TIMEFRAMES: readonly TickerTimeframe[] = ['SMN', 'TMN', 'MN', 'WK', 'DL'] as const;

/**
 * Display order of all timeframe codes including YR.
 * Used by the timeframe bar to show all possible chips in consistent order.
 */
export const DISPLAY_TIMEFRAMES: readonly TickerTimeframe[] = ['YR', 'SMN', 'TMN', 'MN', 'WK', 'DL'] as const;

/**
 * A fixed 4-tuple of timeframe codes derived from the top of the backend
 * ticker timeframe list. Used by chart hotkeys (positions 0-3) and
 * screenshot flows.
 */
export type Sequence = readonly [TickerTimeframe, TickerTimeframe, TickerTimeframe, TickerTimeframe];

/**
 * Number of timeframe codes in a Sequence (always 4).
 */
export const SEQUENCE_LENGTH = 4;

/**
 * Default Sequence used when the backend timeframe list is empty or
 * cannot produce a valid 4-tuple from the top.
 */
export const DEFAULT_SEQUENCE: Sequence = ['TMN', 'MN', 'WK', 'DL'];

/**
 * Sorts an array of timeframe codes into the display order.
 * Handles YR and any valid code; unknown codes go to the end.
 * @param codes - Timeframe codes to sort
 * @returns Sorted array in display order
 */
export function sortTimeframesForDisplay(codes: TickerTimeframe[]): TickerTimeframe[] {
  const order = new Map<TickerTimeframe, number>();
  DISPLAY_TIMEFRAMES.forEach((code, idx) => order.set(code, idx));
  return [...codes].sort((a, b) => {
    const idxA = order.get(a) ?? 99;
    const idxB = order.get(b) ?? 99;
    return idxA - idxB;
  });
}

/**
 * Returns the index of a timeframe code within the canonical order.
 * @param code - Timeframe code to look up
 * @returns Index in CANONICAL_TIMEFRAMES, or -1 if not found
 */
export function getTimeFrameCodeIndex(code: TickerTimeframe): number {
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
export function normalizeTimeframes(codes: string[]): TickerTimeframe[] {
  const valid = new Set<TickerTimeframe>(CANONICAL_TIMEFRAMES as unknown as TickerTimeframe[]);
  const seen = new Set<TickerTimeframe>();
  const result: TickerTimeframe[] = [];

  for (const code of codes) {
    const tfCode = code as TickerTimeframe;
    if (valid.has(tfCode) && !seen.has(tfCode)) {
      seen.add(tfCode);
      result.push(tfCode);
    }
  }

  // Sort by canonical order (highest first)
  return result.sort((a, b) => CANONICAL_TIMEFRAMES.indexOf(a) - CANONICAL_TIMEFRAMES.indexOf(b));
}

/**
 * Derives a 4-frame Sequence from the backend ticker timeframe list.
 *
 * Rules:
 * 1. Unsupported codes (outside CANONICAL_TIMEFRAMES, e.g. 'YR') are silently dropped
 * 2. Codes are sorted in canonical order (highest → lowest)
 * 3. The highest supported timeframe is used as the start of the sequence
 * 4. If start + 4 contiguous canonical codes fit, that 4-tuple is returned
 * 5. If they do not fit, DEFAULT_SEQUENCE is returned
 *
 * @param timeframes - Raw timeframe codes from backend
 * @returns Sequence (always exactly 4 entries)
 */
export function deriveSequence(timeframes: string[]): Sequence {
  // Filter to supported codes (drop YR) and sort canonically
  const supported = normalizeTimeframes(timeframes);

  // If no supported frames found, fall back to default
  if (supported.length === 0) {
    return DEFAULT_SEQUENCE;
  }

  // Start from the top supported frame and take the next 4 contiguous
  // canonical frames (including the top), filling in any gaps.
  const startIdx = getTimeFrameCodeIndex(supported[0]);
  if (startIdx < 0) {
    return DEFAULT_SEQUENCE;
  }

  const endIdx = Math.min(startIdx + SEQUENCE_LENGTH, CANONICAL_TIMEFRAMES.length);
  if (endIdx - startIdx < SEQUENCE_LENGTH) {
    return DEFAULT_SEQUENCE;
  }

  const result: TickerTimeframe[] = [];
  for (let i = startIdx; i < endIdx; i++) {
    result.push(CANONICAL_TIMEFRAMES[i]);
  }
  return result as unknown as Sequence;
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
 * TimeFrameConfigs are organized by code in FRAMES_BY_CODE. The Sequence
 * (4-tuple) is derived dynamically from the backend ticker timeframes.
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
