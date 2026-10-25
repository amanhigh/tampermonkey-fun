// ── Barkat API Types ──
// Read-only analysis payload returned by the Barkat backend
// (GET /tickers/{ticker}); the server contract is authoritative and policy
// values are backend-owned and never recomputed here.

import { TickerTimeframe } from './timeframe';

/** Health verdict reported by the Barkat analysis policy. */
export type BarkatStatus = 'pass' | 'warning' | 'fail';

/**
 * Timeframes eligible for analysis rows.
 * Subset of {@link TickerTimeframe} — the backend never reports YR or DL rows.
 */
export type BarkatTimeframe = TickerTimeframe.SMN | TickerTimeframe.TMN | TickerTimeframe.MN | TickerTimeframe.WK;

/** One timeframe row of the analysis. */
export interface BarkatTimeframeAnalysis {
  timeframe: BarkatTimeframe;
  status: BarkatStatus;
}

/** Analysis payload (`data` of the success envelope). */
export interface BarkatTickerAnalysis {
  ticker: string;
  timeframes: BarkatTimeframeAnalysis[];
}
