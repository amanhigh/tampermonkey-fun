// ── Price Alert Types ──

import { PaginationMetadata } from './api';

/** Sort fields supported by GET /v1/api/alerts. */
export type PriceAlertSortBy = 'trigger_price' | 'created_at';

/** Sort directions supported by GET /v1/api/alerts. */
export type PriceAlertSortOrder = 'asc' | 'desc';

/** Full Price alert record returned by the API (matches go-fun models/barkat/price_alert.go PriceAlert). */
export interface PriceAlert {
  alert_id?: string;
  pair_id: string;
  trigger_price: number;
  created_at: string;
}

/** One canonical refreshed Investing.com price-alert row for PUT /v1/api/alerts. */
// HACK: Better naming for line item ?
export interface PriceAlertInput {
  pair_id: string;
  alert_id: string;
  trigger_price: number;
}

/** Request body for PUT /v1/api/alerts (replace). */
export interface PriceAlertReplaceRequest {
  alerts: PriceAlertInput[];
}

/** Replacement summary returned by PUT /v1/api/alerts. */
export interface PriceAlertReplaceResult {
  pairs_replaced: number;
  alerts_created: number;
}

/** Request body for POST /v1/api/tickers/{ticker}/alerts (pending create). */
export interface PendingPriceAlertRequest {
  trigger_price: number;
}

/** Query parameters for listing Price alerts. */
export interface PriceAlertQueryParams {
  ticker?: string;
  'sort-by'?: PriceAlertSortBy;
  'sort-order'?: PriceAlertSortOrder;
  offset?: number;
  limit?: number;
}

/** Paginated Price alert list response. */
export interface PriceAlertListResponse {
  alerts: PriceAlert[];
  metadata: PaginationMetadata;
}
