import { BaseClient, IBaseClient } from './base';
import { CreateGttRequest, GttApiResponse } from '../models/kite';

/**
 * Client for Zerodha GTT (Good Till Triggered) Operations
 * Handles GTT order creation, deletion, and retrieval
 */
export interface IKiteClient extends IBaseClient {
  /**
   * Create a new Good Till Triggered (GTT) order
   * @param request GTT order creation request
   * @throws Error when GTT creation fails
   */
  createGTT(request: CreateGttRequest): Promise<void>;

  /**
   * Load existing Good Till Triggered (GTT) orders
   * @param callback Callback to handle retrieved GTT orders
   * @throws Error when fetching GTT fails
   */
  loadGTT(callback: (data: GttApiResponse) => void): Promise<void>;

  /**
   * Delete a specific Good Till Triggered (GTT) order
   * @param id ID of the GTT order to delete
   * @throws Error when GTT deletion fails
   */
  deleteGTT(id: string): Promise<void>;
}

/**
 * Client for Zerodha GTT (Good Till Triggered) Operations
 * Handles GTT order creation, deletion, and retrieval
 */
export class KiteClient extends BaseClient implements IKiteClient {
  /**
   * Creates an instance of KiteClient
   * @param baseUrl Base URL for Kite API
   */
  constructor(baseUrl: string = 'https://kite.zerodha.com/oms/gtt') {
    super(baseUrl);
  }

  /**
   * Get authorization token from local storage
   * @private
   * @returns Encoded authentication token
   * @throws Error when token is not found in localStorage
   */
  private getAuthToken(): string {
    const token = localStorage.getItem('__storejs_kite_enctoken');
    if (!token) {
      throw new Error('Auth token not found in localStorage');
    }
    return JSON.parse(token);
  }

  /**
   * Prepare standard headers for Kite API requests
   * @private
   * @returns Headers for API requests
   */
  private getDefaultHeaders(): Record<string, string> {
    return {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.5',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Kite-Version': '2.4.0',
      Authorization: 'enctoken ' + this.getAuthToken(),
    };
  }

  /**
   * Create a new Good Till Triggered (GTT) order
   * @param request GTT order creation request
   * @throws Error when GTT creation fails
   */
  // FIXME: #B Create ATO alert based Orders
  async createGTT(request: CreateGttRequest): Promise<void> {
    try {
      await this.makeRequest('/triggers', {
        method: 'POST',
        data: request.encode(),
        headers: this.getDefaultHeaders(),
      });
    } catch (error) {
      throw new Error(`Error Creating GTT: ${(error as Error).message}`);
    }
  }

  /**
   * Load existing Good Till Triggered (GTT) orders
   * @param callback Callback to handle retrieved GTT orders
   * @throws Error when fetching GTT fails
   */
  async loadGTT(callback: (data: GttApiResponse) => void): Promise<void> {
    try {
      const data = await this.makeRequest<GttApiResponse>('/triggers', {
        method: 'GET',
        headers: this.getDefaultHeaders(),
      });
      callback(data);
    } catch (error) {
      throw new Error(`Error Fetching GTT: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a specific Good Till Triggered (GTT) order
   * @param id ID of the GTT order to delete
   * @throws Error when GTT deletion fails
   */
  async deleteGTT(id: string): Promise<void> {
    try {
      await this.makeRequest(`/triggers/${id}`, {
        method: 'DELETE',
        headers: {
          ...this.getDefaultHeaders(),
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (error) {
      throw new Error(`Error Deleting Trigger: ${(error as Error).message}`);
    }
  }
}
