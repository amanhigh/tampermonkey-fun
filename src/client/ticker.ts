import { BaseClient, IBaseClient } from './base';
import {
  CreateTickerRequest,
  TickerLastOpenedUpdate,
  TickerListResponse,
  TickerQueryParams,
  Ticker,
  TickerUpdateRequest,
} from '../models/ticker';
import { KohanEnvelope } from '../models/journal';
import { Constants } from '../models/constant';

/**
 * TickerClient handles Barkat ticker CRUD and listing operations against the Kohan backend.
 * Covers primary ticker (Section 2.2.1) and Alert ticker (Section 2.2.2) APIs.
 */
export interface ITickerClient extends IBaseClient {
  // ── Primary Ticker APIs (2.2.1) ──

  /**
   * Create a primary ticker record.
   * @param data - Ticker creation payload
   * @returns Promise resolving with created ticker
   */
  createTicker(data: CreateTickerRequest): Promise<Ticker>;

  /**
   * Retrieve one primary ticker with mapped Alert tickers.
   * @param ticker - Primary ticker identity
   * @returns Promise resolving with ticker record
   */
  getTicker(ticker: string): Promise<Ticker>;

  /**
   * Update mutable primary ticker metadata. Accepts only the fields to change;
   * missing fields are merged from the current backend record.
   * @param ticker - Primary ticker identity
   * @param data - Partial update payload (exchange, timeframes, type, state, trend, is_fno)
   * @returns Promise resolving with updated ticker
   */
  updateTicker(ticker: string, data: TickerUpdateRequest): Promise<Ticker>;

  /**
   * Update only the recent-open timestamp.
   * @param ticker - Primary ticker identity
   * @param data - Last opened timestamp payload
   * @returns Promise resolving with updated ticker
   */
  patchTickerLastOpened(ticker: string, data: TickerLastOpenedUpdate): Promise<Ticker>;

  /**
   * Delete a primary ticker (cascades to linked Alert tickers).
   * @param ticker - Primary ticker identity
   */
  deleteTicker(ticker: string): Promise<void>;

  /**
   * List ALL tickers matching filters, auto-paginating through all pages.
   * Backend enforces limit=100 max per page; this method handles the loop.
   * @param params - Query parameters (offset/limit are overridden)
   * @returns Promise resolving with all matching ticker records
   */
  listTickers(params: TickerQueryParams): Promise<Ticker[]>;
}

/**
 * TickerClient handles Barkat ticker CRUD and listing operations against the Kohan backend.
 */
export class TickerClient extends BaseClient implements ITickerClient {
  /**
   * Creates an instance of TickerClient.
   * @param baseUrl - Base URL for Kohan API (defaults to Constants.KOHAN.BASE_URL)
   */
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
    super(baseUrl);
  }

  // ── Primary Ticker APIs (2.2.1) ──

  /** @inheritdoc */
  async createTicker(data: CreateTickerRequest): Promise<Ticker> {
    try {
      const response = await this.makeRequest<KohanEnvelope<Ticker>>('/tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async getTicker(ticker: string): Promise<Ticker> {
    try {
      const response = await this.makeRequest<KohanEnvelope<Ticker>>(`/tickers/${encodeURIComponent(ticker)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async updateTicker(ticker: string, data: TickerUpdateRequest): Promise<Ticker> {
    try {
      // Fetch current record to merge partial update fields
      const record = await this.getTicker(ticker);
      // Build full mutable payload by overlaying only provided fields
      const fullData = this.buildFullUpdatePayload(record, data);
      const response = await this.makeRequest<KohanEnvelope<Ticker>>(`/tickers/${encodeURIComponent(ticker)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(fullData),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async patchTickerLastOpened(ticker: string, data: TickerLastOpenedUpdate): Promise<Ticker> {
    try {
      const response = await this.makeRequest<KohanEnvelope<Ticker>>(`/tickers/${encodeURIComponent(ticker)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to patch ticker last opened: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async deleteTicker(ticker: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/tickers/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw new Error(`Failed to delete ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async listTickers(params: TickerQueryParams): Promise<Ticker[]> {
    const limit = Constants.KOHAN.PAGE_LIMIT;
    let offset = 0;
    let total = 0;
    const all: Ticker[] = [];
    // HACK: Generic pagination helper in BaseClient instead of copy/paste in each method that needs it ?

    try {
      do {
        const query = this.buildTickerQuery({ ...params, limit, offset });
        const response = await this.makeRequest<KohanEnvelope<TickerListResponse>>(`/tickers?${query.toString()}`);
        const data = response.data;
        all.push(...data.tickers);
        total = data.metadata.total;
        offset += limit;
      } while (offset < total);

      return all;
    } catch (error) {
      throw new Error(`Failed to list all tickers: ${(error as Error).message}`);
    }
  }

  /**
   * Merge a partial TickerUpdateRequest into the current Ticker to produce
   * the full mutable payload the backend PUT endpoint expects.
   *
   * Fields that are `undefined` in the partial request are kept from the record.
   * Explicit `null` on `exchange` is preserved (clears exchange on backend).
   */
  private buildFullUpdatePayload(record: Ticker, partial: TickerUpdateRequest): Required<TickerUpdateRequest> {
    return {
      exchange: partial.exchange !== undefined ? partial.exchange : record.exchange,
      timeframes: partial.timeframes ?? record.timeframes,
      type: partial.type ?? record.type,
      state: partial.state ?? record.state,
      trend: partial.trend ?? record.trend,
      is_fno: partial.is_fno ?? record.is_fno,
    };
  }

  // ── Private Helpers ──

  /**
   * Append non-undefined values from a key/value list to a URLSearchParams instance.
   */
  private static setQueryParams(
    query: URLSearchParams,
    entries: Array<[string, string | number | boolean | undefined]>
  ): void {
    for (const [key, value] of entries) {
      if (value !== undefined) {
        query.set(key, String(value));
      }
    }
  }

  /**
   * Build URLSearchParams for primary ticker query.
   */
  private buildTickerQuery(params: TickerQueryParams): URLSearchParams {
    // HACK: Reuse move to Base Client ?
    const query = new URLSearchParams();
    TickerClient.setQueryParams(query, [
      ['search', params.search],
      ['exchange', params.exchange],
      ['type', params.type],
      ['state', params.state],
      ['trend', params.trend],
      ['is-fno', params['is-fno']],
      ['opened-after', params['opened-after']],
      ['sort-by', params['sort-by']],
      ['sort-order', params['sort-order']],
      ['offset', params.offset],
      ['limit', params.limit],
    ]);
    return query;
  }
}
