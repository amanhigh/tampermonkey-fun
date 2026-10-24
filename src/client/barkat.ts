import { Constants } from '../models/constant';
import { BarkatTickerAnalysis, parseBarkatTickerAnalysis } from '../models/barkat';
import { BaseClient, IBaseClient, wrapClientError } from './base';

/**
 * Read-only client for the Barkat analysis API.
 * Contract and policy are owned by the Barkat backend; this layer only
 * transports and validates responses (see models/barkat.ts).
 */
export interface IBarkatClient extends IBaseClient {
  /**
   * Get the multi-timeframe analysis for a ticker.
   * Raw ticker symbol is sent as-is (URL-encoded); no exchange conversion is applied.
   * @param ticker - Native ticker symbol, no exchange prefix (e.g. "BRK.B")
   * @returns Promise resolving to the validated analysis payload
   */
  getTickerAnalysis(ticker: string): Promise<BarkatTickerAnalysis>;
}

/** Read-only Barkat analysis client (defaults to Constants.BARKAT.BASE_URL). */
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
      const response = await this.makeRequest<unknown>(`/tickers/${encodeURIComponent(ticker)}`);
      return parseBarkatTickerAnalysis(response, ticker);
    } catch (error) {
      throw wrapClientError(error, `Failed to get ticker analysis for ${ticker}`);
    }
  }
}
