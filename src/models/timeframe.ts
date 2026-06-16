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
 * Metadata for a single timeframe code: rank/order, TradingView label,
 * toolbar button index, and zone-drawing style prefix.
 */
export type Timeframe = Readonly<{
  code: TickerTimeframe;
  label: string;
  rank: number;
  toolbar: number;
  style: string;
}>;

/**
 * Unified registry of all timeframe codes in display order (highest → lowest).
 * This replaces CANONICAL_TIMEFRAMES, DISPLAY_TIMEFRAMES, TIMEFRAME_RANK,
 * TimeFrameConfig, and Constants.TIME.FRAMES_BY_CODE.
 *
 * YR (12M) is now fully wired: toolbar index 7, style 'H'.
 */
export const TIMEFRAMES: readonly Timeframe[] = [
  { code: TickerTimeframe.YR, label: '12M', rank: 0, toolbar: 7, style: 'H' },
  { code: TickerTimeframe.SMN, label: '6M', rank: 1, toolbar: 6, style: 'I' },
  { code: TickerTimeframe.TMN, label: '3M', rank: 2, toolbar: 5, style: 'T' },
  { code: TickerTimeframe.MN, label: 'M', rank: 3, toolbar: 4, style: 'VH' },
  { code: TickerTimeframe.WK, label: 'W', rank: 4, toolbar: 3, style: 'H' },
  { code: TickerTimeframe.DL, label: 'D', rank: 5, toolbar: 2, style: 'I' },
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

// ── Registry helpers ──

/**
 * Returns the timeframe metadata for the given code, or undefined if not found.
 */
export function getTimeframeByCode(code: TickerTimeframe): Timeframe | undefined {
  return TIMEFRAMES.find((tf) => tf.code === code);
}

/**
 * Returns the timeframe metadata for the given toolbar index, or undefined if not found.
 */
export function getTimeframeByToolbar(toolbar: number): Timeframe | undefined {
  return TIMEFRAMES.find((tf) => tf.toolbar === toolbar);
}

/**
 * Returns all timeframe codes in registry order.
 */
export function getTimeframeCodes(): readonly TickerTimeframe[] {
  return TIMEFRAMES.map((tf) => tf.code);
}

/**
 * Compares two timeframe codes by registry rank.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * Unknown codes sort to the end.
 */
export function compareTimeframes(a: TickerTimeframe, b: TickerTimeframe): number {
  const ra = getTimeframeByCode(a)?.rank ?? 99;
  const rb = getTimeframeByCode(b)?.rank ?? 99;
  return ra - rb;
}

/**
 * Sorts an array of timeframe codes into registry order.
 * Unknown codes go to the end.
 */
export function sortTimeframes(codes: TickerTimeframe[]): TickerTimeframe[] {
  return [...codes].sort(compareTimeframes);
}

/**
 * Filters an array of raw strings to valid TickerTimeframe codes,
 * preserving the registry order. Invalid codes are silently dropped.
 */
export function parseTimeframes(codes: string[]): TickerTimeframe[] {
  const valid = new Set(Object.values(TickerTimeframe));
  const unique = new Set<TickerTimeframe>();
  const result: TickerTimeframe[] = [];

  for (const raw of codes) {
    const tf = raw as TickerTimeframe;
    if (valid.has(tf) && !unique.has(tf)) {
      unique.add(tf);
      result.push(tf);
    }
  }

  return sortTimeframes(result);
}

/**
 * Filters and sorts an array of timeframe codes to registry order.
 * Semantically identical to sortTimeframes + unique filter.
 * Kept for backward compatibility.
 */
export function normalizeTimeframes(codes: string[]): TickerTimeframe[] {
  return parseTimeframes(codes);
}

/**
 * Derives a 4-frame Sequence from the backend ticker timeframe list.
 *
 * Rules:
 * 1. Invalid codes are silently dropped
 * 2. Codes are sorted by registry rank (highest → lowest)
 * 3. The highest-ranked timeframe is used as the start of the sequence
 * 4. If start + 4 contiguous registry codes fit, that 4-tuple is returned
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

  const startIdx = TIMEFRAMES.findIndex((tf) => tf.code === supported[0]);
  if (startIdx < 0 || startIdx + SEQUENCE_LENGTH > TIMEFRAMES.length) {
    return DEFAULT_SEQUENCE;
  }

  const result = TIMEFRAMES.slice(startIdx, startIdx + SEQUENCE_LENGTH).map((tf) => tf.code);
  return result as unknown as Sequence;
}
