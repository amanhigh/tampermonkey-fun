// ── Alert Ticker Types ──

import { PaginationMetadata } from './api';

/** Alert ticker type: PRIMARY is the canonical alert-bearing ticker; SECONDARY is a lookup alias. */
export type AlertTickerType = 'PRIMARY' | 'SECONDARY';

/** Full Alert ticker record returned by the API (matches go-fun models/barkat/alert_ticker.go AlertTicker). */
export interface AlertTicker {
  symbol: string;
  pair_id: string;
  name: string;
  exchange: string | null;
  type: AlertTickerType;
  ticker: string;
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
  type?: AlertTickerType;
  offset?: number;
  limit?: number;
}

/** Paginated Alert ticker list response. */
export interface AlertTickerListResponse {
  alert_tickers: AlertTicker[];
  metadata: PaginationMetadata;
}
