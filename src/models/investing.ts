export interface SearchResultItem {
  name: string;
  pair_ID: string;
  exchange_name_short: string;
}

export interface SearchResponse {
  All?: SearchResultItem[];
}
