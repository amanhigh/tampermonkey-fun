import { BaseClient, IBaseClient } from './base';
import {
  AlertTickerListResponse,
  AlertTickerQueryParams,
  AlertTickerRecord,
  CreateAlertTickerRequest,
} from '../models/alert_ticker';
import { KohanEnvelope } from '../models/kohan';
import { Constants } from '../models/constant';

/**
 * TickerAlertClient handles Alert ticker (Investing.com identity) CRUD and listing
 * operations against the Kohan backend. Covers Section 2.2.2 from the PRD.
 */
export interface ITickerAlertClient extends IBaseClient {
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
   * List ALL alert tickers matching filters, auto-paginating through all pages.
   * Backend enforces limit=100 max per page; this method handles the loop.
   * @param params - Query parameters (offset/limit are overridden)
   * @returns Promise resolving with all matching alert ticker records
   */
  listAllAlertTickers(params: AlertTickerQueryParams): Promise<AlertTickerRecord[]>;
}

/**
 * TickerAlertClient handles Alert ticker CRUD and listing against the Kohan backend.
 */
export class TickerAlertClient extends BaseClient implements ITickerAlertClient {
  /**
   * Creates an instance of TickerAlertClient.
   * @param baseUrl - Base URL for Kohan API (defaults to Constants.KOHAN.BASE_URL)
   */
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
    super(baseUrl);
  }

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
  async listAllAlertTickers(params: AlertTickerQueryParams): Promise<AlertTickerRecord[]> {
    const limit = Constants.KOHAN.PAGE_LIMIT;
    let offset = 0;
    let total = 0;
    const all: AlertTickerRecord[] = [];

    try {
      do {
        const query = this.buildAlertTickerQuery({ ...params, limit, offset });
        const response = await this.makeRequest<KohanEnvelope<AlertTickerListResponse>>(
          `/alert-tickers?${query.toString()}`
        );
        const data = response.data;
        all.push(...data.alert_tickers);
        total = data.metadata.total;
        offset += limit;
      } while (offset < total);

      return all;
    } catch (error) {
      throw new Error(`Failed to list all Alert tickers: ${(error as Error).message}`);
    }
  }

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
   * Build URLSearchParams for Alert ticker query.
   */
  private buildAlertTickerQuery(params: AlertTickerQueryParams): URLSearchParams {
    const query = new URLSearchParams();
    TickerAlertClient.setQueryParams(query, [
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
