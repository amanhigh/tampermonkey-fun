// ── Enums matching Go models/barkat/ticker.go ──

import { PaginationMetadata } from './api';

/** Ordered timeframe codes. */
export type TickerTimeframe = 'YR' | 'SMN' | 'TMN' | 'MN' | 'WK' | 'DL';

/** Broad ticker classification. */
export type TickerType = 'EQUITY' | 'INDEX' | 'CRYPTO' | 'COMMODITY' | 'FX' | 'BOND' | 'COMPOSITE';

/** Ticker workflow state. */
export type TickerState = 'WATCHED' | 'READY' | 'BLACKLIST';

/** Trend classification. */
export type TickerTrend = 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND';

import { AlertTicker } from './alert_ticker';

import { Constants } from './constant';

// ── Primary Ticker Class ──

/**
 * Full primary ticker record returned by the API (matches go-fun models/barkat/ticker.go Ticker).
 */
export class Ticker {
  ticker: string = '';
  exchange: string = '';
  timeframes: TickerTimeframe[] = [];
  type: TickerType = 'EQUITY';
  state: TickerState = 'WATCHED';
  trend: TickerTrend = 'SIDEWAYS';
  last_opened_at: string = '';
  is_fno: boolean = false;
  created_at: string = '';
  updated_at: string = '';
  alert_tickers?: AlertTicker[];
  alert_ticker_count?: number;

  constructor(data: Partial<Ticker> = {}) {
    Object.assign(this, data);
  }

  /** Exchange-qualified name: "EXCHANGE:ticker" or raw ticker when exchange absent. */
  get qualifiedName(): string {
    return this.exchange ? `${this.exchange}:${this.ticker}` : this.ticker;
  }
}

/** Request body for POST /v1/api/tickers (create). */
export interface CreateTickerRequest {
  ticker: string;
  exchange: string;
  timeframes: TickerTimeframe[];
  type: TickerType;
  state: TickerState;
  trend: TickerTrend;
  last_opened_at: string;
  is_fno?: boolean;
}

/** Request body for PUT /v1/api/tickers/{ticker} (update mutable fields).
 * Exchange is optional — when omitted, the client fills it from the current record.
 * Other fields are optional and merged the same way.
 */
export interface TickerUpdateRequest {
  exchange?: string;
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
  tickers: Ticker[];
  metadata: PaginationMetadata;
}

/**
 * Checks if a symbol is a composite symbol containing special characters
 * like '/', '*', '-', ':' or matching special-case composite tickers.
 * @param symbol Symbol to check
 * @returns True if symbol is composite
 */
export function isCompositeSymbol(symbol: string): boolean {
  // FIXME: Use Backend Composite Type and Thong Logic.
  const normalized = symbol.toUpperCase();
  if (Constants.COMPOSITE.SPECIAL_TICKERS.includes(normalized)) {
    return true;
  }
  return Constants.COMPOSITE.CHARACTERS.some((char) => symbol.includes(char));
}

// ── Domain Events ──

import { DomainEventType } from './domain_event';

export interface TickerMarkedRecentEvent {
  type: DomainEventType.TICKER_MARKED_RECENT;
  ticker: string;
}
