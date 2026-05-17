import { BaseClient, IBaseClient } from './base';
import {
  CreateTickerRequest,
  TickerLastOpenedUpdate,
  TickerListResponse,
  TickerQueryParams,
  TickerRecord,
  TickerUpdateRequest,
} from '../models/ticker';
import { KohanEnvelope } from '../models/kohan';
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
  createTicker(data: CreateTickerRequest): Promise<TickerRecord>;

  /**
   * Retrieve one primary ticker with mapped Alert tickers.
   * @param ticker - Primary ticker identity
   * @returns Promise resolving with ticker record
   */
  getTicker(ticker: string): Promise<TickerRecord>;

  /**
   * Replace mutable primary ticker metadata.
   * @param ticker - Primary ticker identity
   * @param data - Update payload (exchange, timeframes, type, state, trend, is_fno)
   * @returns Promise resolving with updated ticker
   */
  updateTicker(ticker: string, data: TickerUpdateRequest): Promise<TickerRecord>;

  /**
   * Update only the recent-open timestamp.
   * @param ticker - Primary ticker identity
   * @param data - Last opened timestamp payload
   * @returns Promise resolving with updated ticker
   */
  patchTickerLastOpened(ticker: string, data: TickerLastOpenedUpdate): Promise<TickerRecord>;

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
  listTickers(params: TickerQueryParams): Promise<TickerRecord[]>;
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
  async createTicker(data: CreateTickerRequest): Promise<TickerRecord> {
    try {
      const response = await this.makeRequest<KohanEnvelope<TickerRecord>>('/tickers', {
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
  async getTicker(ticker: string): Promise<TickerRecord> {
    try {
      const response = await this.makeRequest<KohanEnvelope<TickerRecord>>(`/tickers/${encodeURIComponent(ticker)}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async updateTicker(ticker: string, data: TickerUpdateRequest): Promise<TickerRecord> {
    try {
      const response = await this.makeRequest<KohanEnvelope<TickerRecord>>(`/tickers/${encodeURIComponent(ticker)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async patchTickerLastOpened(ticker: string, data: TickerLastOpenedUpdate): Promise<TickerRecord> {
    try {
      const response = await this.makeRequest<KohanEnvelope<TickerRecord>>(`/tickers/${encodeURIComponent(ticker)}`, {
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
  async listTickers(params: TickerQueryParams): Promise<TickerRecord[]> {
    const limit = Constants.KOHAN.PAGE_LIMIT;
    let offset = 0;
    let total = 0;
    const all: TickerRecord[] = [];
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
