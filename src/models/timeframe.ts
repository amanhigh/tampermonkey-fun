// ── Shared timeframe types ──
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
 * A fixed 4-tuple of timeframe codes derived from the top of the backend
 * ticker timeframe list. Used by chart hotkeys (positions 0-3) and
 * screenshot flows.
 */
export type Sequence = readonly [TickerTimeframe, TickerTimeframe, TickerTimeframe, TickerTimeframe];

/**
 * Default Sequence (4-tuple) for timeframe hotkeys and screenshot flows.
 * Represents TMN → MN → WK → DL in catalog order.
 * Used as fallback when no active timeframes are configured, and as the
 * default timeframe list for NSE tickers when starting tracking.
 */
export const DEFAULT_SEQUENCE: Sequence = [
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
  TickerTimeframe.DL,
];

/**
 * Default timeframe list for non-NSE tickers (YR, SMN, TMN, MN, WK).
 * Used when starting tracking for a new ticker on other exchanges.
 */
export const NON_NSE_DEFAULT_TIMEFRAMES: readonly TickerTimeframe[] = [
  TickerTimeframe.YR,
  TickerTimeframe.SMN,
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
];
