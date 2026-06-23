import { wrapClientError } from './base';
import { KohanClient, IKohanClient } from './kohan';
import {
  CreateTickerRequest,
  TickerLastOpenedUpdate,
  TickerListResponse,
  TickerQueryParams,
  Ticker,
  TickerUpdateRequest,
} from '../models/ticker';
import { KohanEnvelope } from '../models/api';
import { Constants } from '../models/constant';

/**
 * TickerClient handles Barkat ticker CRUD and listing operations against the Kohan backend.
 * Covers primary ticker (Section 2.2.1) and Alert ticker (Section 2.2.2) APIs.
 */
export interface ITickerClient extends IKohanClient {
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
export class TickerClient extends KohanClient implements ITickerClient {
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
      return new Ticker(response.data);
    } catch (error) {
      throw wrapClientError(error, 'Failed to create ticker');
    }
  }

  /** @inheritdoc */
  async getTicker(ticker: string): Promise<Ticker> {
    try {
      const response = await this.makeRequest<KohanEnvelope<Ticker>>(`/tickers/${encodeURIComponent(ticker)}`);
      return new Ticker(response.data);
    } catch (error) {
      throw wrapClientError(error, 'Failed to get ticker');
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
      return new Ticker(response.data);
    } catch (error) {
      throw wrapClientError(error, 'Failed to update ticker');
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
      return new Ticker(response.data);
    } catch (error) {
      throw wrapClientError(error, 'Failed to patch ticker last opened');
    }
  }

  /** @inheritdoc */
  async deleteTicker(ticker: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/tickers/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw wrapClientError(error, 'Failed to delete ticker');
    }
  }

  /** @inheritdoc */
  async listTickers(params: TickerQueryParams): Promise<Ticker[]> {
    return this.listAllPages<TickerListResponse, Ticker>(
      '/tickers',
      [
        ['search', params.search],
        ['exchange', params.exchange],
        ['type', params.type],
        ['state', params.state],
        ['trend', params.trend],
        ['is-fno', params['is-fno']],
        ['opened-after', params['opened-after']],
        ['sort-by', params['sort-by']],
        ['sort-order', params['sort-order']],
      ],
      Constants.KOHAN.PAGE_LIMIT,
      (data) => data.tickers.map((t) => new Ticker(t)),
      'Failed to list all tickers'
    );
  }

  /**
   * Merge a partial TickerUpdateRequest into the current Ticker to produce
   * the full mutable payload the backend PUT endpoint expects.
   *
   * Fields that are `undefined` in the partial request are kept from the record.
   */
  private buildFullUpdatePayload(record: Ticker, partial: TickerUpdateRequest): Required<TickerUpdateRequest> {
    return {
      exchange: partial.exchange ?? record.exchange,
      timeframes: partial.timeframes ?? record.timeframes,
      type: partial.type ?? record.type,
      state: partial.state ?? record.state,
      trend: partial.trend ?? record.trend,
      is_fno: partial.is_fno ?? record.is_fno,
    };
  }
}
