// ── Barkat API Types ──
// Read-only analysis payload returned by the Barkat backend
// (GET /tickers/{ticker}); policy values are backend-owned and never recomputed here.

import { TickerTimeframe } from './timeframe';

/** Health verdict reported by the Barkat analysis policy. */
export type BarkatStatus = 'pass' | 'warning' | 'fail';

/**
 * Timeframes eligible for analysis rows.
 * Subset of {@link TickerTimeframe} — the backend never reports YR or DL rows.
 */
export type BarkatTimeframe = TickerTimeframe.SMN | TickerTimeframe.TMN | TickerTimeframe.MN | TickerTimeframe.WK;

/** Supported analysis timeframes in catalog order. */
export const BARKAT_TIMEFRAMES: readonly BarkatTimeframe[] = [
  TickerTimeframe.SMN,
  TickerTimeframe.TMN,
  TickerTimeframe.MN,
  TickerTimeframe.WK,
];

/** Supported status values in escalating severity order. */
export const BARKAT_STATUSES: readonly BarkatStatus[] = ['pass', 'warning', 'fail'];

/** Metric keys carried by every timeframe row. */
export const BARKAT_METRIC_KEYS = ['zone_failures', 'strategy_wins', 'strategy_entries'] as const;

/** Metric key union derived from {@link BARKAT_METRIC_KEYS}. */
export type BarkatMetricKey = (typeof BARKAT_METRIC_KEYS)[number];

/**
 * Single policy metric for a timeframe.
 * `percentage` is an integer 0..100, or null when the metric is not applicable.
 */
export interface BarkatMetric {
  percentage: number | null;
  status: BarkatStatus;
}

/** Metric bundle attached to each timeframe row. */
export type BarkatMetrics = Record<BarkatMetricKey, BarkatMetric>;

/** One timeframe row of the analysis. */
export interface BarkatTimeframeAnalysis {
  timeframe: BarkatTimeframe;
  status: BarkatStatus;
  metrics: BarkatMetrics;
}

/** Analysis payload (`data` of the success envelope). */
export interface BarkatTickerAnalysis {
  ticker: string;
  timeframes: BarkatTimeframeAnalysis[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is BarkatStatus {
  return typeof value === 'string' && (BARKAT_STATUSES as readonly string[]).includes(value);
}

function isTimeframe(value: unknown): value is BarkatTimeframe {
  return typeof value === 'string' && (BARKAT_TIMEFRAMES as readonly string[]).includes(value);
}

function parseMetric(value: unknown, key: string): BarkatMetric {
  if (!isRecord(value)) {
    throw new Error(`Invalid metric "${key}": expected an object`);
  }
  const { percentage, status } = value;
  if (percentage !== null) {
    if (typeof percentage !== 'number' || !Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
      throw new Error(`Invalid metric "${key}": percentage must be an integer 0..100 or null`);
    }
  }
  if (!isStatus(status)) {
    throw new Error(`Invalid metric "${key}": unknown status "${String(status)}"`);
  }
  return { percentage, status };
}

function parseTimeframeRow(value: unknown, index: number): BarkatTimeframeAnalysis {
  if (!isRecord(value)) {
    throw new Error(`Invalid timeframe row at index ${index}: expected an object`);
  }
  const { timeframe, status, metrics } = value;
  if (!isTimeframe(timeframe)) {
    throw new Error(`Invalid timeframe row at index ${index}: unsupported timeframe "${String(timeframe)}"`);
  }
  if (!isStatus(status)) {
    throw new Error(`Invalid timeframe row "${timeframe}": unknown status "${String(status)}"`);
  }
  if (!isRecord(metrics)) {
    throw new Error(`Invalid timeframe row "${timeframe}": metrics must be an object`);
  }
  const parsed = {} as BarkatMetrics;
  for (const key of BARKAT_METRIC_KEYS) {
    parsed[key] = parseMetric(metrics[key], `${timeframe}.${key}`);
  }
  return { timeframe, status, metrics: parsed };
}

function parseTicker(value: unknown, expectedTicker: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new Error('Invalid response: missing ticker');
  }
  if (value.toUpperCase() !== expectedTicker.toUpperCase()) {
    throw new Error(`Ticker mismatch: requested "${expectedTicker}" but received "${value}"`);
  }
  return value;
}

function parseTimeframes(value: unknown): BarkatTimeframeAnalysis[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid response: timeframes must be an array');
  }
  if (value.length !== BARKAT_TIMEFRAMES.length) {
    throw new Error(
      `Invalid response: expected ${BARKAT_TIMEFRAMES.length} timeframe rows but received ${value.length}`
    );
  }
  const rows = value.map((row, index) => parseTimeframeRow(row, index));
  const seen = new Set<BarkatTimeframe>();
  for (const row of rows) {
    if (seen.has(row.timeframe)) {
      throw new Error(`Invalid response: duplicate timeframe row "${row.timeframe}"`);
    }
    seen.add(row.timeframe);
  }
  return rows;
}

/**
 * Validate a raw Barkat response and return its analysis payload.
 * Rejects non-success envelopes, mismatched tickers (case-insensitive),
 * incomplete/duplicated timeframe rows, and malformed metrics.
 * Policy values are passed through untouched — nothing is recomputed here.
 * @param payload - Raw parsed HTTP response
 * @param expectedTicker - Ticker used for the request
 * @returns Validated analysis payload
 */
export function parseBarkatTickerAnalysis(payload: unknown, expectedTicker: string): BarkatTickerAnalysis {
  if (!isRecord(payload)) {
    throw new Error('Invalid response: expected a success envelope object');
  }
  if (payload.status !== 'success') {
    throw new Error(`Unsuccessful response status "${String(payload.status)}"`);
  }
  if (!isRecord(payload.data)) {
    throw new Error('Invalid response: missing data object');
  }
  const ticker = parseTicker(payload.data.ticker, expectedTicker);
  return { ticker, timeframes: parseTimeframes(payload.data.timeframes) };
}
