import { BaseClient, IBaseClient } from './base';
import {
  CreateJournalImageRequest,
  CreateJournalRequest,
  CreateJournalTagRequest,
  JournalListResponse,
  JournalQueryParams,
  JournalRecord,
  KohanEnvelope,
  ScreenshotRequest,
  ScreenshotResponse,
  UpdateJournalStatusRequest,
  UpdateJournalStatusResponse,
} from '../models/kohan';
import { Constants } from '../models/constant';

/**
 * KohanClient handles interactions with the local Kohan API
 * Provides methods for taking screenshots, creating journals, and managing journal sub-resources.
 */
export interface IKohanClient extends IBaseClient {
  /**
   * List journals matching query parameters.
   * @param params Query parameters for filtering journals
   * @returns Promise resolving with paginated journal list
   */
  listJournals(params: JournalQueryParams): Promise<JournalListResponse>;

  /**
   * Add an image to an existing journal.
   * @param journalId Journal external ID
   * @param image Image request payload
   * @returns Promise resolving with created image record
   */
  addJournalImage(journalId: string, image: CreateJournalImageRequest): Promise<JournalRecord>;

  /**
   * Add a tag to an existing journal.
   * @param journalId Journal external ID
   * @param tag Tag request payload
   * @returns Promise resolving with created tag record
   */
  addJournalTag(journalId: string, tag: CreateJournalTagRequest): Promise<JournalRecord>;

  /**
   * Update a journal's status.
   * @param journalId Journal external ID
   * @param status New status value
   * @returns Promise resolving with update response
   */
  updateJournalStatus(journalId: string, status: UpdateJournalStatusRequest): Promise<UpdateJournalStatusResponse>;

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
 * Provides methods for taking screenshots, creating journals, and managing journal sub-resources.
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

  /** @inheritdoc */
  async listJournals(params: JournalQueryParams): Promise<JournalListResponse> {
    try {
      const query = new URLSearchParams();
      if (params.ticker) {
        query.set('ticker', params.ticker);
      }
      if (params.type) {
        query.set('type', params.type);
      }
      if (params.status) {
        query.set('status', params.status);
      }
      if (params.limit) {
        query.set('limit', String(params.limit));
      }
      if (params['sort-by']) {
        query.set('sort-by', params['sort-by']);
      }
      if (params['sort-order']) {
        query.set('sort-order', params['sort-order']);
      }

      return await this.makeRequest<JournalListResponse>(`/journals?${query.toString()}`);
    } catch (error) {
      throw new Error(`Failed to list journals: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async addJournalImage(journalId: string, image: CreateJournalImageRequest): Promise<JournalRecord> {
    try {
      return await this.makeRequest<JournalRecord>(`/journals/${journalId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(image),
      });
    } catch (error) {
      throw new Error(`Failed to add journal image: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async addJournalTag(journalId: string, tag: CreateJournalTagRequest): Promise<JournalRecord> {
    try {
      return await this.makeRequest<JournalRecord>(`/journals/${journalId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(tag),
      });
    } catch (error) {
      throw new Error(`Failed to add journal tag: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  async updateJournalStatus(
    journalId: string,
    status: UpdateJournalStatusRequest
  ): Promise<UpdateJournalStatusResponse> {
    try {
      return await this.makeRequest<UpdateJournalStatusResponse>(`/journals/${journalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(status),
      });
    } catch (error) {
      throw new Error(`Failed to update journal status: ${(error as Error).message}`);
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
