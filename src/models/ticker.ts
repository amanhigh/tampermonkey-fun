// ── Enums matching Go models/barkat/ticker.go ──

/** Ordered timeframe codes. */
export type TickerTimeframe = 'YR' | 'SMN' | 'TMN' | 'MN' | 'WK' | 'DL';

/** Broad ticker classification. */
export type TickerType = 'EQUITY' | 'INDEX' | 'CRYPTO' | 'COMMODITY' | 'FX' | 'BOND' | 'COMPOSITE';

/** Ticker workflow state. */
export type TickerState = 'WATCHED' | 'READY' | 'BLACKLIST';

/** Trend classification. */
export type TickerTrend = 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND';

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
  alert_tickers?: AlertTickerRecord[];
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

/** Request body for PUT /v1/api/tickers/{ticker} (update mutable fields). */
export interface TickerUpdateRequest {
  exchange?: string | null;
  timeframes: TickerTimeframe[];
  type: TickerType;
  state: TickerState;
  trend: TickerTrend;
  is_fno: boolean;
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

// ── Alert Ticker Types ──

/** Full Alert ticker record returned by the API (matches go-fun models/barkat/alert_ticker.go AlertTicker). */
export interface AlertTickerRecord {
  symbol: string;
  pair_id: string;
  name: string;
  exchange: string | null;
  ticker?: string;
  created_at: string;
  updated_at: string;
}

/** Request body for POST /v1/api/tickers/{ticker}/alert-tickers (create). */
export interface CreateAlertTickerRequest {
  symbol: string;
  pair_id: string;
  name: string;
  exchange?: string | null;
}

/** Query parameters for listing Alert tickers. */
export interface AlertTickerQueryParams {
  symbol?: string;
  ticker?: string;
  'pair-id'?: string;
  exchange?: string;
  offset?: number;
  limit?: number;
}

/** Paginated Alert ticker list response. */
export interface AlertTickerListResponse {
  alert_tickers: AlertTickerRecord[];
  metadata: {
    total: number;
    offset: number;
    limit: number;
  };
}
