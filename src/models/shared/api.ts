// ── Shared API Types ──

/** Standard Kohan API response envelope wrapping response data. */
export interface KohanEnvelope<T> {
  status: 'success' | 'fail' | 'error';
  data: T;
}

/** Pagination metadata included in list response envelopes. */
export interface PaginationMetadata {
  total: number;
  offset: number;
  limit: number;
}
