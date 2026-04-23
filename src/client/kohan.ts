import { BaseClient, IBaseClient } from './base';
import {
  CreateJournalRequest,
  JournalRecord,
  KohanEnvelope,
  ScreenshotRequest,
  ScreenshotResponse,
} from '../models/kohan';
import { Constants } from '../models/constant';

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
   * Take journal screenshots via the API
   * @param request - Screenshot request payload
   * @returns Promise resolving with captured screenshot metadata
   * @throws Error when taking journal screenshots fails
   */
  screenshot(request: ScreenshotRequest): Promise<ScreenshotResponse>;

  /**
   * Create a journal through the V1 journal API.
   * @param request - Journal creation request payload
   * @returns Promise resolving with created journal data
   * @throws Error when creating the journal fails
   */
  createJournal(request: CreateJournalRequest): Promise<JournalRecord>;

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
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
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
      await this.makeRequest<void>(`/os/ticker/${journalTag}/record`);
    } catch (error) {
      throw new Error(`Failed to record ticker: ${(error as Error).message}`);
    }
  }

  /**
   * Take journal screenshots via the API
   * @param request - Screenshot request payload
   * @returns Promise resolving with captured screenshot metadata
   * @throws Error when taking journal screenshots fails
   */
  async screenshot(request: ScreenshotRequest): Promise<ScreenshotResponse> {
    try {
      const response = await this.makeRequest<KohanEnvelope<ScreenshotResponse>>('/os/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(request),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to take journal screenshots: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async createJournal(request: CreateJournalRequest): Promise<JournalRecord> {
    try {
      const response = await this.makeRequest<KohanEnvelope<JournalRecord>>('/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(request),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create journal: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve clipboard data from the API
   * @returns Promise resolving with clipboard data
   * @throws Error when retrieving clipboard data fails
   */
  async getClip(): Promise<string> {
    try {
      return await this.makeRequest<string>('/os/clip/');
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
      await this.makeRequest<void>('/os/submap/enable', {
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
      await this.makeRequest<void>('/os/submap/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ submap }),
      });
    } catch (error) {
      throw new Error(`Failed to disable submap: ${(error as Error).message}`);
    }
  }
}
