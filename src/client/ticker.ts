import { BaseClient, IBaseClient } from './base';
import {
  AlertTickerListResponse,
  AlertTickerQueryParams,
  AlertTickerRecord,
  CreateAlertTickerRequest,
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
   * List primary tickers with filters and pagination.
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving with paginated ticker list
   */
  listTickers(params: TickerQueryParams): Promise<TickerListResponse>;

  // ── Alert Ticker APIs (2.2.2) ──

  /**
   * Create an Alert ticker under a primary ticker.
   * @param ticker - Parent primary ticker identity
   * @param data - Alert ticker creation payload
   * @returns Promise resolving with created Alert ticker
   */
  createAlertTicker(ticker: string, data: CreateAlertTickerRequest): Promise<AlertTickerRecord>;

  /**
   * Retrieve one Alert ticker by symbol.
   * @param symbol - Alert ticker symbol
   * @returns Promise resolving with Alert ticker record
   */
  getAlertTicker(symbol: string): Promise<AlertTickerRecord>;

  /**
   * Delete one Alert ticker by symbol.
   * @param symbol - Alert ticker symbol
   */
  deleteAlertTicker(symbol: string): Promise<void>;

  /**
   * List Alert tickers with filters and pagination.
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving with paginated Alert ticker list
   */
  listAlertTickers(params: AlertTickerQueryParams): Promise<AlertTickerListResponse>;
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
  async listTickers(params: TickerQueryParams): Promise<TickerListResponse> {
    try {
      const query = this.buildTickerQuery(params);
      const response = await this.makeRequest<KohanEnvelope<TickerListResponse>>(`/tickers?${query.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list tickers: ${(error as Error).message}`);
    }
  }

  // ── Alert Ticker APIs (2.2.2) ──

  /** @inheritdoc */
  async createAlertTicker(ticker: string, data: CreateAlertTickerRequest): Promise<AlertTickerRecord> {
    try {
      const response = await this.makeRequest<KohanEnvelope<AlertTickerRecord>>(
        `/tickers/${encodeURIComponent(ticker)}/alert-tickers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(data),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create Alert ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async getAlertTicker(symbol: string): Promise<AlertTickerRecord> {
    try {
      const response = await this.makeRequest<KohanEnvelope<AlertTickerRecord>>(
        `/alert-tickers/${encodeURIComponent(symbol)}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get Alert ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async deleteAlertTicker(symbol: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/alert-tickers/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw new Error(`Failed to delete Alert ticker: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async listAlertTickers(params: AlertTickerQueryParams): Promise<AlertTickerListResponse> {
    try {
      const query = this.buildAlertTickerQuery(params);
      const response = await this.makeRequest<KohanEnvelope<AlertTickerListResponse>>(
        `/alert-tickers?${query.toString()}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list Alert tickers: ${(error as Error).message}`);
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

  /**
   * Build URLSearchParams for Alert ticker query.
   */
  private buildAlertTickerQuery(params: AlertTickerQueryParams): URLSearchParams {
    const query = new URLSearchParams();
    TickerClient.setQueryParams(query, [
      ['symbol', params.symbol],
      ['ticker', params.ticker],
      ['pair-id', params['pair-id']],
      ['exchange', params.exchange],
      ['offset', params.offset],
      ['limit', params.limit],
    ]);
    return query;
  }
}
