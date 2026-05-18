import { ITickerClient } from '../client/ticker';
import {
  CreateTickerRequest,
  TickerLastOpenedUpdate,
  TickerQueryParams,
  TickerRecord,
  TickerUpdateRequest,
} from '../models/ticker';

/**
 * Request type for starting to track a new primary ticker.
 * Alias for the backend create-ticker request.
 */
export type StartTrackingRequest = CreateTickerRequest;

/**
 * Interface for managing primary TradingView ticker lifecycle and data.
 *
 * Domain methods:
 * - startTracking / stopTracking → user-facing lifecycle
 * - markRecent → convenience over PATCH last-opened
 * - setExchange → convenience over updateTicker
 *
 * Generic read/write methods mirror the backend client.
 */
export interface ITickerManager {
  /**
   * Start tracking a new primary ticker. Creates a backend record.
   * @param data - Ticker creation payload
   * @returns Promise resolving with created ticker record
   */
  startTracking(data: StartTrackingRequest): Promise<TickerRecord>;

  /**
   * Get one primary ticker record.
   * @param ticker - Primary ticker identity
   * @returns Promise resolving with ticker record
   */
  getTicker(ticker: string): Promise<TickerRecord>;

  /**
   * Update mutable primary ticker metadata.
   * @param ticker - Primary ticker identity
   * @param data - Partial update payload
   * @returns Promise resolving with updated ticker record
   */
  updateTicker(ticker: string, data: TickerUpdateRequest): Promise<TickerRecord>;

  /**
   * Record the current ticker as recently opened.
   * Internally calls PATCH last_opened_at with current timestamp.
   * @param ticker - Primary ticker identity
   */
  markRecent(ticker: string): Promise<void>;

  /**
   * Stop tracking a primary ticker. Backend cascades to linked Alert tickers.
   * @param ticker - Primary ticker identity
   */
  stopTracking(ticker: string): Promise<void>;

  /**
   * List ALL primary tickers matching filters, auto-paginating.
   * @param params - Query parameters
   * @returns Promise resolving with all matching ticker records
   */
  listTickers(params: TickerQueryParams): Promise<TickerRecord[]>;

  /**
   * Set or clear the exchange on a primary ticker.
   * Convenience wrapping updateTicker with { exchange }.
   * @param ticker - Primary ticker identity
   * @param exchange - Exchange code (e.g. "NSE") or null to clear
   * @returns Promise resolving with updated ticker record
   */
  setExchange(ticker: string, exchange: string | null): Promise<TickerRecord>;
}

/**
 * Manages primary TradingView ticker lifecycle and data against the Kohan backend.
 */
export class TickerManager implements ITickerManager {
  constructor(private readonly tickerClient: ITickerClient) {}

  /** @inheritdoc */
  async startTracking(data: StartTrackingRequest): Promise<TickerRecord> {
    return this.tickerClient.createTicker(data);
  }

  /** @inheritdoc */
  async getTicker(ticker: string): Promise<TickerRecord> {
    return this.tickerClient.getTicker(ticker);
  }

  /** @inheritdoc */
  async updateTicker(ticker: string, data: TickerUpdateRequest): Promise<TickerRecord> {
    return this.tickerClient.updateTicker(ticker, data);
  }

  /** @inheritdoc */
  async markRecent(ticker: string): Promise<void> {
    await this.tickerClient.patchTickerLastOpened(ticker, {
      last_opened_at: new Date().toISOString(),
    });
  }

  /** @inheritdoc */
  async stopTracking(ticker: string): Promise<void> {
    await this.tickerClient.deleteTicker(ticker);
  }

  /** @inheritdoc */
  async listTickers(params: TickerQueryParams): Promise<TickerRecord[]> {
    return this.tickerClient.listTickers(params);
  }

  /** @inheritdoc */
  async setExchange(ticker: string, exchange: string | null): Promise<TickerRecord> {
    return this.tickerClient.updateTicker(ticker, { exchange });
  }
}
