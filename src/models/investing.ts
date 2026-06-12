export interface SearchResultItem {
  name: string;
  pair_ID: string;
  symbol: string;
  exchange_name_short: string;
}

export interface SearchResponse {
  All?: SearchResultItem[];
}

/**
 * Instrument returned by the public Investing.com search API.
 */
export interface Instrument {
  /** Investing.com pair id (equivalent to pair_id) */
  id: number;
  /** Relative URL path on Investing.com */
  url: string;
  /** Human-readable instrument name */
  description: string;
  /** Investing.com symbol / ticker */
  symbol: string;
  /** Exchange code */
  exchange: string;
  /** Country flag code, optional */
  flag?: string;
  /** Instrument type, optional */
  type?: string;
}

/**
 * Raw response from GET https://api.investing.com/api/search/.
 */
export interface InvestingResponse {
  quotes?: Instrument[];
}
