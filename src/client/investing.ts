import { Alert, PairInfo } from '../models/alert';
import { SearchResponse, SearchResultItem } from '../models/investing';
import { BaseClient, IBaseClient } from './base';

/**
 * Client for interacting with Investing.com API
 */
export interface IInvestingClient extends IBaseClient {
  /**
   * Creates a new price alert
   */
  createAlert(
    name: string,
    pairId: string,
    price: number,
    ltp: number
  ): Promise<{
    name: string;
    pairId: string;
    price: number;
  }>;

  /**
   * Deletes an existing alert
   */
  deleteAlert(alert: Alert): Promise<void>;

  /**
   * Fetch symbol data from the investing.com API
   */
  fetchSymbolData(symbol: string): Promise<PairInfo[]>;

  /**
   * Fetches HTML content from alert center page
   * @returns Promise resolving to alert center HTML content
   * @throws Error if request fails or response is invalid
   */
  getAllAlerts(): Promise<string>;
}

/**
 * Client for interacting with Investing.com API
 */
export class InvestingClient extends BaseClient implements IInvestingClient {
  constructor(baseUrl: string = 'https://in.investing.com') {
    super(baseUrl);
  }

  /**
   * Creates a new price alert
   */
  async createAlert(
    name: string,
    pairId: string,
    price: number,
    ltp: number
  ): Promise<{
    name: string;
    pairId: string;
    price: number;
  }> {
    const threshold = price > ltp ? 'over' : 'under';

    const data = new URLSearchParams({
      alertType: 'instrument',
      'alertParams[alert_trigger]': 'price',
      'alertParams[pair_ID]': pairId,
      'alertParams[threshold]': threshold,
      'alertParams[frequency]': 'Once',
      'alertParams[value]': price.toString(),
      'alertParams[platform]': 'desktopAlertsCenter',
      'alertParams[email_alert]': 'Yes',
    });

    try {
      await this.makeRequest('/useralerts/service/create', {
        method: 'POST',
        data: data.toString(),
      });
      return { name, pairId, price };
    } catch (error) {
      throw new Error(`Failed to create alert: ${(error as Error).message}`);
    }
  }

  /**
   * Deletes an existing alert
   */
  async deleteAlert(alert: Alert): Promise<void> {
    const data = new URLSearchParams({
      alertType: 'instrument',
      'alertParams[alert_ID]': alert.id,
      'alertParams[platform]': 'desktop',
    });

    try {
      await this.makeRequest('/useralerts/service/delete', {
        method: 'POST',
        data: data.toString(),
        responseType: 'text',
      });
    } catch (error) {
      throw new Error(`Failed to delete alert: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch symbol data from the investing.com API
   */
  async fetchSymbolData(symbol: string): Promise<PairInfo[]> {
    const data = new URLSearchParams({
      search_text: symbol,
      term: symbol,
      country_id: '0',
      tab_id: 'All',
    });

    try {
      const response = await this.makeRequest<SearchResponse>(
        '/search/service/search?searchType=alertCenterInstruments',
        {
          method: 'POST',
          data: data.toString(),
        }
      );

      if (!response.All?.length) {
        throw new Error(`No results found for symbol: ${symbol}`);
      }

      return response.All.map(
        (item: SearchResultItem) => new PairInfo(item.name, item.pair_ID.toString(), item.exchange_name_short,item.symbol)
      );
    } catch (error) {
      throw new Error(`Failed to fetch symbol data: ${(error as Error).message}`);
    }
  }

  /**
   * Fetches HTML content from alert center page
   * @returns Promise resolving to alert center HTML content
   * @throws Error if request fails or response is invalid
   */
  async getAllAlerts(): Promise<string> {
    const response = await this.makeRequest<string>('/members-admin/alert-center', {
      method: 'GET',
      responseType: 'text',
    });

    // Ensure we got valid HTML response containing alerts
    if (!response || !response.includes('js-alert-item')) {
      throw new Error('Invalid alert center response');
    }

    return response;
  }
}
