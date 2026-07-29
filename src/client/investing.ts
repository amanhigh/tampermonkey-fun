import { Alert } from '../models/alert';
import { BaseClient, IBaseClient } from './base';

/**
 * Interface for interacting with Investing.com API
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
