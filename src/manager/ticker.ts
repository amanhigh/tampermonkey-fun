import { ITickerClient } from '../client/ticker';
import { CreateTickerRequest, TickerQueryParams, Ticker, TickerUpdateRequest } from '../models/ticker';

/**
 * Request type for starting to track a new primary ticker.
 * Alias for the backend create-ticker request.
 */
export type StartTrackingRequest = CreateTickerRequest;

/**
 * Interface for managing primary TradingView ticker lifecycle and data.
 *
 * Domain methods:
 * - markRecent → convenience over PATCH last-opened
 * - setExchange → convenience over updateTicker
 *
 * Generic read/write methods mirror the backend client.
 */
export interface ITickerManager {
  /**
   * Get one primary ticker record.
   * @param ticker - Primary ticker identity
   * @returns Promise resolving with ticker record
   */
  getTicker(ticker: string): Promise<Ticker>;

  /**
   * Update mutable primary ticker metadata.
   * @param ticker - Primary ticker identity
   * @param data - Partial update payload
   * @returns Promise resolving with updated ticker record
   */
  updateTicker(ticker: string, data: TickerUpdateRequest): Promise<Ticker>;

  /**
   * Record the current ticker as recently opened.
   * Internally calls PATCH last_opened_at with current timestamp.
   * @param ticker - Primary ticker identity
   */
  markRecent(ticker: string): Promise<void>;

  /**
   * List ALL primary tickers matching filters, auto-paginating.
   * @param params - Query parameters
   * @returns Promise resolving with all matching ticker records
   */
  listTickers(params: TickerQueryParams): Promise<Ticker[]>;

  /**
   * Set the exchange on a primary ticker.
   * Convenience wrapping updateTicker with { exchange }.
   * @param ticker - Primary ticker identity
   * @param exchange - Exchange code (e.g. "NSE")
   * @returns Promise resolving with updated ticker record
   */
  setExchange(ticker: string, exchange: string): Promise<Ticker>;
}

/**
 * Manages primary TradingView ticker CRUD against the Kohan backend.
 */
export class TickerManager implements ITickerManager {
  constructor(private readonly tickerClient: ITickerClient) {}

  /** @inheritdoc */
  async getTicker(ticker: string): Promise<Ticker> {
    return this.tickerClient.getTicker(ticker);
  }

  /** @inheritdoc */
  async updateTicker(ticker: string, data: TickerUpdateRequest): Promise<Ticker> {
    return this.tickerClient.updateTicker(ticker, data);
  }

  /** @inheritdoc */
  async markRecent(ticker: string): Promise<void> {
    await this.tickerClient.patchTickerLastOpened(ticker, {
      last_opened_at: new Date().toISOString(),
    });
  }

  /** @inheritdoc */
  async listTickers(params: TickerQueryParams): Promise<Ticker[]> {
    return this.tickerClient.listTickers(params);
  }

  /** @inheritdoc */
  async setExchange(ticker: string, exchange: string): Promise<Ticker> {
    return this.tickerClient.updateTicker(ticker, { exchange });
  }
}
