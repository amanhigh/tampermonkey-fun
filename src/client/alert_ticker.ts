import { wrapClientError } from './base';
import { KohanClient, IKohanClient } from './kohan';
import {
  AlertTickerListResponse,
  AlertTickerQueryParams,
  AlertTicker,
  CreateAlertTickerRequest,
} from '../models/alert_ticker';
import { KohanEnvelope } from '../models/api';
import { Constants } from '../models/constant';

/**
 * AlertTickerClient handles Alert ticker (Investing.com identity) CRUD and listing
 * operations against the Kohan backend. Covers Section 2.2.2 from the PRD.
 */
export interface IAlertTickerClient extends IKohanClient {
  /**
   * Create an Alert ticker under a primary ticker.
   * @param ticker - Parent primary ticker identity
   * @param data - Alert ticker creation payload
   * @returns Promise resolving with created Alert ticker
   */
  createAlertTicker(ticker: string, data: CreateAlertTickerRequest): Promise<AlertTicker>;

  /**
   * Retrieve one Alert ticker by symbol.
   * @param symbol - Alert ticker symbol
   * @returns Promise resolving with Alert ticker record
   */
  getAlertTicker(symbol: string): Promise<AlertTicker>;

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
  listAlertTickers(params: AlertTickerQueryParams): Promise<AlertTicker[]>;
}

/**
 * AlertTickerClient handles Alert ticker CRUD and listing against the Kohan backend.
 */
export class AlertTickerClient extends KohanClient implements IAlertTickerClient {
  /**
   * Creates an instance of AlertTickerClient.
   * @param baseUrl - Base URL for Kohan API (defaults to Constants.KOHAN.BASE_URL)
   */
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
    super(baseUrl);
  }

  /** @inheritdoc */
  async createAlertTicker(ticker: string, data: CreateAlertTickerRequest): Promise<AlertTicker> {
    try {
      const response = await this.makeRequest<KohanEnvelope<AlertTicker>>(
        `/tickers/${encodeURIComponent(ticker)}/alert-tickers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify(data),
        }
      );
      return response.data;
    } catch (error) {
      throw wrapClientError(error, 'Failed to create Alert ticker');
    }
  }

  /** @inheritdoc */
  async getAlertTicker(symbol: string): Promise<AlertTicker> {
    try {
      const response = await this.makeRequest<KohanEnvelope<AlertTicker>>(
        `/alert-tickers/${encodeURIComponent(symbol)}`
      );
      return response.data;
    } catch (error) {
      throw wrapClientError(error, 'Failed to get Alert ticker');
    }
  }

  /** @inheritdoc */
  async deleteAlertTicker(symbol: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/alert-tickers/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw wrapClientError(error, 'Failed to delete Alert ticker');
    }
  }

  /** @inheritdoc */
  async listAlertTickers(params: AlertTickerQueryParams): Promise<AlertTicker[]> {
    return this.listAllPages<AlertTickerListResponse, AlertTicker>(
      '/alert-tickers',
      [
        ['symbol', params.symbol],
        ['ticker', params.ticker],
        ['pair-id', params['pair-id']],
        ['exchange', params.exchange],
        ['type', params.type],
      ],
      Constants.KOHAN.PAGE_LIMIT,
      (data) => data.alert_tickers,
      'Failed to list all Alert tickers'
    );
  }
}
