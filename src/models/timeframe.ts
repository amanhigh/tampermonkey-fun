// ── Shared timeframe code type ──
// Defined here (not in ticker.ts) to avoid circular dependency:
// ticker.ts → constant.ts → timeframe.ts
// timeframe.ts must not import from ticker.ts or constant.ts.

/**
 * Ordered timeframe codes representing TradingView interval presets.
 * Mirrors the Go backend model in barkat/ticker.go.
 */
export enum TickerTimeframe {
  YR = 'YR',
  SMN = 'SMN',
  TMN = 'TMN',
  MN = 'MN',
  WK = 'WK',
  DL = 'DL',
}

/**
 * Canonical ordering of supported timeframe codes, highest to lowest.
 *
 * NOTE: YR is listed in DISPLAY_TIMEFRAMES for the timeframe bar but is
 * NOT yet wired in frontend TimeFrameConfig / toolbar. Code that derives
 * a Sequence must filter YR out until a config entry exists.
 *
 * FIXME: Include 'YR' once TimeFrameConfig for yearly is defined in FRAMES_BY_CODE.
 */
export const CANONICAL_TIMEFRAMES: readonly TickerTimeframe[] = [
  TickerTimeframe.SMN,
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
  TickerTimeframe.DL,
];

/**
 * Display order of all timeframe codes including YR.
 * Used by the timeframe bar to show all possible chips in consistent order.
 */
export const DISPLAY_TIMEFRAMES: readonly TickerTimeframe[] = [
  TickerTimeframe.YR,
  TickerTimeframe.SMN,
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
  TickerTimeframe.DL,
];

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
export const DEFAULT_SEQUENCE: Sequence = [
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
  TickerTimeframe.DL,
];

// Precomputed display-order rank for each timeframe code. Unknown codes get rank 99.
const TIMEFRAME_RANK: Record<string, number> = {
  [TickerTimeframe.YR]: 0,
  [TickerTimeframe.SMN]: 1,
  [TickerTimeframe.TMN]: 2,
  [TickerTimeframe.MN]: 3,
  [TickerTimeframe.WK]: 4,
  [TickerTimeframe.DL]: 5,
};

/**
 * Sorts an array of timeframe codes into the display order.
 * Handles YR and any valid code; unknown codes go to the end.
 * @param codes - Timeframe codes to sort
 * @returns Sorted array in display order
 */
export function sortTimeframesForDisplay(codes: TickerTimeframe[]): TickerTimeframe[] {
  return [...codes].sort((a, b) => {
    const idxA = TIMEFRAME_RANK[a] ?? 99;
    const idxB = TIMEFRAME_RANK[b] ?? 99;
    return idxA - idxB;
  });
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
  const codeSet = new Set(codes);
  return CANONICAL_TIMEFRAMES.filter((tf) => codeSet.has(tf));
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
  const supported = normalizeTimeframes(timeframes);

  if (supported.length === 0) {
    return DEFAULT_SEQUENCE;
  }

  const startIdx = CANONICAL_TIMEFRAMES.indexOf(supported[0]);
  if (startIdx < 0 || startIdx + SEQUENCE_LENGTH > CANONICAL_TIMEFRAMES.length) {
    return DEFAULT_SEQUENCE;
  }

  return CANONICAL_TIMEFRAMES.slice(startIdx, startIdx + SEQUENCE_LENGTH) as unknown as Sequence;
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
    public readonly symbol: string,
    public readonly style: string,
    public readonly toolbar: number
  ) {}
}
