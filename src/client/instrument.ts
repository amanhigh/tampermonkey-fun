import { InvestingResponse } from '../models/investing';
import { BaseClient, IBaseClient } from './base';

/**
 * Client for the public Investing.com instrument search API.
 * Base URL points to https://api.investing.com/api/search which is a different domain
 * than the main InvestingClient (https://in.investing.com).
 */
export interface IInstrumentClient extends IBaseClient {
  /**
   * Search public Investing instruments by query string.
   * Raw pass-through to GET https://api.investing.com/api/search/
   * No matching logic applied — returns raw response unchanged.
   * @param query - Search term
   * @param limit - Maximum results (defaults to 10)
   * @returns Promise resolving to raw InvestingResponse
   */
  getInstruments(query: string, limit?: number): Promise<InvestingResponse>;
}

/**
 * Client for the public Investing.com instrument search API.
 * Uses its own base URL (https://api.investing.com/api/search) separate from the main InvestingClient.
 */
export class InstrumentClient extends BaseClient implements IInstrumentClient {
  private static readonly DEFAULT_LIMIT = 10;

  constructor(baseUrl: string = 'https://api.investing.com/api/search/') {
    super(baseUrl);
  }

  /** @inheritdoc */
  async getInstruments(query: string, limit: number = InstrumentClient.DEFAULT_LIMIT): Promise<InvestingResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const queryString = `?${params.toString()}`;

    try {
      return await this.makeRequest<InvestingResponse>(queryString);
    } catch (error) {
      throw new Error(`Failed to get instruments: ${(error as Error).message}`);
    }
  }
}
