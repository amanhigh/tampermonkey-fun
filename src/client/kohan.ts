import { BaseClient, IBaseClient } from './base';

/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for recording tickers and retrieving clipboard data
 */
export interface IKohanClient extends IBaseClient {
  /**
   * Record a ticker via the API
   * @param journalTag - Ticker symbol to record
   * @returns Promise resolving with the API response
   * @throws Error when recording ticker fails
   */
  recordTicker(journalTag: string): Promise<void>;

  /**
   * Retrieve clipboard data from the API
   * @returns Promise resolving with clipboard data
   * @throws Error when retrieving clipboard data fails
   */
  getClip(): Promise<string>;

  /**
   * Enable a submap via the API
   * @param submap - Submap name to enable (e.g., 'swiftkeys')
   * @returns Promise resolving when submap is enabled
   * @throws Error when enabling submap fails
   */
  enableSubmap(submap: string): Promise<void>;

  /**
   * Disable a submap via the API
   * @param submap - Submap name to disable
   * @returns Promise resolving when submap is disabled
   * @throws Error when disabling submap fails
   */
  disableSubmap(submap: string): Promise<void>;
}

/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for recording tickers and retrieving clipboard data
 */
export class KohanClient extends BaseClient implements IKohanClient {
  /**
   * Creates an instance of KohanClient
   * @param baseUrl - Base URL for Kohan API
   */
  constructor(baseUrl: string = 'http://localhost:9010/v1') {
    super(baseUrl);
  }

  /**
   * Record a ticker via the API
   * @param journalTag - Ticker symbol to record
   * @returns Promise resolving with the API response
   * @throws Error when recording ticker fails
   */
  async recordTicker(journalTag: string): Promise<void> {
    try {
      await this.makeRequest<void>(`/ticker/${journalTag}/record`);
    } catch (error) {
      throw new Error(`Failed to record ticker: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve clipboard data from the API
   * @returns Promise resolving with clipboard data
   * @throws Error when retrieving clipboard data fails
   */
  async getClip(): Promise<string> {
    try {
      return await this.makeRequest<string>('/clip');
    } catch (error) {
      throw new Error(`Failed to get clip: ${(error as Error).message}`);
    }
  }

  /**
   * Enable a submap via the API
   * @param submap - Submap name to enable (e.g., 'swiftkeys')
   * @returns Promise resolving when submap is enabled
   * @throws Error when enabling submap fails
   */
  async enableSubmap(submap: string): Promise<void> {
    try {
      await this.makeRequest<void>('/submap/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap }),
      });
    } catch (error) {
      throw new Error(`Failed to enable submap: ${(error as Error).message}`);
    }
  }

  /**
   * Disable a submap via the API
   * @param submap - Submap name to disable
   * @returns Promise resolving when submap is disabled
   * @throws Error when disabling submap fails
   */
  async disableSubmap(submap: string): Promise<void> {
    try {
      await this.makeRequest<void>('/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap }),
      });
    } catch (error) {
      throw new Error(`Failed to disable submap: ${(error as Error).message}`);
    }
  }
}
