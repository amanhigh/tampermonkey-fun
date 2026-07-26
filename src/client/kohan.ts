import { BaseClient, IBaseClient } from './base';

/**
 * Semantic type alias for clients backed by the Kohan backend.
 * Domain clients (TickerClient, AlertTickerClient, etc.) should extend
 * KohanClient and implement this interface.
 */
export type IKohanClient = IBaseClient;

/**
 * KohanClient is a transport/query helper for Kohan API endpoints.
 *
 * It provides shared query-building utilities:
 *  - buildQuery(entries)  → URLSearchParams (skips undefined only)
 *  - appendQuery(endpoint, query) → endpoint?query
 *
 * Pagination is handled at the manager layer (BaseManager.listAllPages).
 * Domain clients should extend KohanClient for transport and query helpers only.
 */
export class KohanClient extends BaseClient implements IKohanClient {
  /**
   * Creates an instance of KohanClient.
   * @param baseUrl - Base URL for Kohan API
   */
  constructor(baseUrl: string) {
    super(baseUrl);
  }

  // ── Query Helpers ──

  /**
   * Build URLSearchParams from key-value pairs.
   * Only `undefined` is skipped — `false`, `0`, and empty strings are preserved.
   */
  protected buildQuery(entries: Array<[string, string | number | boolean | undefined]>): URLSearchParams {
    const query = new URLSearchParams();
    for (const [key, value] of entries) {
      if (value !== undefined) {
        query.set(key, String(value));
      }
    }
    return query;
  }

  /**
   * Append query string to an endpoint path.
   * Returns the endpoint unchanged when the query is empty.
   */
  protected appendQuery(endpoint: string, query: URLSearchParams): string {
    const qs = query.toString();
    return qs ? `${endpoint}?${qs}` : endpoint;
  }
}
