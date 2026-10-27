import { Constants } from '../models/constant';
import { BarkatTickerAnalysis } from '../models/barkat';
import { BaseClient, IBaseClient, wrapClientError } from './base';

/**
 * Transport client for the Barkat API.
 * Request/response contract, accept semantics and policy are owned by the
 * Barkat backend (see models/barkat.ts); this layer only transports payloads.
 */
export interface IBarkatClient extends IBaseClient {
  /**
   * Get the multi-timeframe analysis for a ticker.
   * Raw ticker symbol is sent as-is (URL-encoded); no exchange conversion is applied.
   * @param ticker - Native ticker symbol, no exchange prefix (e.g. "BRK.B")
   * @returns Promise resolving to the analysis payload
   */
  getTickerAnalysis(ticker: string): Promise<BarkatTickerAnalysis>;

  /**
   * Ask the backend to warm up its cache for the given tickers.
   * Raw ticker symbols are sent as-is; no exchange conversion is applied.
   * The backend acknowledges the request and performs the warm-up work in the
   * background. Acceptance payload is not used by this client.
   * @param tickers - Native ticker symbols, no exchange prefix (e.g. ["BRK.B", "INTC"])
   * @returns Promise resolving once the backend has accepted the request
   */
  warmupTickers(tickers: readonly string[]): Promise<void>;
}

/** Barkat transport client (defaults to Constants.BARKAT.BASE_URL). */
export class BarkatClient extends BaseClient implements IBarkatClient {
  /**
   * Creates an instance of BarkatClient.
   * @param baseUrl - Base URL for the Barkat API (defaults to Constants.BARKAT.BASE_URL)
   */
  constructor(baseUrl: string = Constants.BARKAT.BASE_URL) {
    super(baseUrl);
  }

  /** @inheritdoc */
  async getTickerAnalysis(ticker: string): Promise<BarkatTickerAnalysis> {
    try {
      const response = await this.makeRequest<{ data: BarkatTickerAnalysis }>(`/tickers/${encodeURIComponent(ticker)}`);
      return response.data;
    } catch (error) {
      throw wrapClientError(error, `Failed to get ticker analysis for ${ticker}`);
    }
  }

  /** @inheritdoc */
  async warmupTickers(tickers: readonly string[]): Promise<void> {
    try {
      await this.makeRequest<void>('/tickers/warm-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ tickers }),
      });
    } catch (error) {
      throw wrapClientError(error, `Failed to warm up tickers: ${tickers.join(', ')}`);
    }
  }
}
