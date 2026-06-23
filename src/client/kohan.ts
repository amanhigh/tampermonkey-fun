import { BaseClient, IBaseClient, wrapClientError } from './base';
import { KohanEnvelope, PaginationMetadata } from '../models/api';

/**
 * KohanClient adds Kohan-specific query-building and pagination helpers
 * on top of the transport-only BaseClient. Domain clients that talk to the
 * Kohan backend should extend this instead of BaseClient directly.
 *
 * IKohanClient is a semantic type alias for clients backed by Kohan.
 */
export type IKohanClient = IBaseClient;

/**
 * KohanClient provides shared helpers for Kohan API listings:
 *  - buildQuery(entries)  → URLSearchParams (skips undefined only)
 *  - appendQuery(endpoint, query) → endpoint?query
 *  - listAllPages<TResponse,TItem>() → generic auto-paginating fetcher
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

  // ── Pagination Helper ──

  /**
   * Generic auto-paginating list fetcher for Kohan endpoints.
   *
   * Fetches all pages by incrementing `offset` until `metadata.total` is reached.
   *
   * @typeParam TResponse - Page shape (must include `metadata: PaginationMetadata`)
   * @typeParam TItem    - Per-item type extracted from each page
   *
   * @param endpoint      - API path without query string (e.g. "/tickers")
   * @param filterEntries - Fixed filter key/value pairs (offset/limit are added internally)
   * @param pageLimit     - Items per page
   * @param extractItems  - Maps a page to its item array
   * @param errorMessage  - Human-readable context for error wrapping
   */
  protected async listAllPages<TResponse extends { metadata: PaginationMetadata }, TItem>(
    endpoint: string,
    filterEntries: Array<[string, string | number | boolean | undefined]>,
    pageLimit: number,
    extractItems: (response: TResponse) => TItem[],
    errorMessage: string
  ): Promise<TItem[]> {
    let offset = 0;
    let total = 0;
    const all: TItem[] = [];

    try {
      do {
        const entries: Array<[string, string | number | boolean | undefined]> = [
          ...filterEntries,
          ['offset', offset],
          ['limit', pageLimit],
        ];
        const query = this.buildQuery(entries);
        const response = await this.makeRequest<KohanEnvelope<TResponse>>(this.appendQuery(endpoint, query));
        const data = response.data;
        all.push(...extractItems(data));
        total = data.metadata.total;
        offset += pageLimit;
      } while (offset < total);

      return all;
    } catch (error) {
      throw wrapClientError(error, errorMessage);
    }
  }
}
