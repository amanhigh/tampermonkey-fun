export interface SearchResultItem {
  name: string;
  pair_ID: string;
  symbol: string;
  exchange_name_short: string;
}

export interface SearchResponse {
  All?: SearchResultItem[];
}