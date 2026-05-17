// ── Enums matching Go models/barkat/ticker.go ──

/** Ordered timeframe codes. */
export type TickerTimeframe = 'YR' | 'SMN' | 'TMN' | 'MN' | 'WK' | 'DL';

/** Broad ticker classification. */
export type TickerType = 'EQUITY' | 'INDEX' | 'CRYPTO' | 'COMMODITY' | 'FX' | 'BOND' | 'COMPOSITE';

/** Ticker workflow state. */
export type TickerState = 'WATCHED' | 'READY' | 'BLACKLIST';

/** Trend classification. */
export type TickerTrend = 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND';

import { AlertTicker } from './alert_ticker';

// ── Primary Ticker Types ──

/** Full primary ticker record returned by the API (matches go-fun models/barkat/ticker.go Ticker). */
export interface TickerRecord {
  ticker: string;
  exchange: string | null;
  timeframes: TickerTimeframe[];
  type: TickerType;
  state: TickerState;
  trend: TickerTrend;
  last_opened_at: string;
  is_fno: boolean;
  created_at: string;
  updated_at: string;
  alert_tickers?: AlertTicker[];
  alert_ticker_count?: number;
}

/** Request body for POST /v1/api/tickers (create). */
export interface CreateTickerRequest {
  ticker: string;
  exchange?: string | null;
  timeframes: TickerTimeframe[];
  type: TickerType;
  state: TickerState;
  trend: TickerTrend;
  last_opened_at: string;
  is_fno?: boolean;
}

/** Request body for PUT /v1/api/tickers/{ticker} (update mutable fields).
 * All fields are optional; only provided fields are merged into the current record.
 */
export interface TickerUpdateRequest {
  exchange?: string | null;
  timeframes?: TickerTimeframe[];
  type?: TickerType;
  state?: TickerState;
  trend?: TickerTrend;
  is_fno?: boolean;
}

/** Request body for PATCH /v1/api/tickers/{ticker} (last_opened_at only). */
export interface TickerLastOpenedUpdate {
  last_opened_at: string;
}

/** Query parameters for listing primary tickers. */
export interface TickerQueryParams {
  search?: string;
  exchange?: string;
  type?: TickerType;
  state?: TickerState;
  trend?: TickerTrend;
  'is-fno'?: boolean;
  'opened-after'?: string;
  'sort-by'?: string;
  'sort-order'?: string;
  offset?: number;
  limit?: number;
}

/** Paginated ticker list response. */
export interface TickerListResponse {
  tickers: TickerRecord[];
  metadata: {
    total: number;
    offset: number;
    limit: number;
  };
}
