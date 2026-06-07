import { BaseClient, IBaseClient } from './base';
import {
  CreateJournalImageRequest,
  CreateJournalRequest,
  CreateJournalTagRequest,
  JournalListResponse,
  JournalQueryParams,
  JournalRecord,
  UpdateJournalStatusRequest,
  UpdateJournalStatusResponse,
} from '../models/journal';
import { KohanEnvelope } from '../models/api';
import { Constants } from '../models/constant';

/**
 * JournalClient handles journal CRUD and sub-resource operations
 * against the local Kohan API.
 */
export interface IJournalClient extends IBaseClient {
  /**
   * List journals matching query parameters.
   * @param params Query parameters for filtering journals
   * @returns Promise resolving with paginated journal list
   */
  listJournals(params: JournalQueryParams): Promise<JournalListResponse>;

  /**
   * Create a journal through the V1 journal API.
   * @param request - Journal creation request payload
   * @returns Promise resolving with created journal data
   */
  createJournal(request: CreateJournalRequest): Promise<JournalRecord>;

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
}

/**
 * JournalClient handles journal CRUD and sub-resource operations against the Kohan backend.
 */
export class JournalClient extends BaseClient implements IJournalClient {
  /**
   * Creates an instance of JournalClient.
   * @param baseUrl - Base URL for Kohan API
   */
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
    super(baseUrl);
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
      if (params.offset !== undefined) {
        query.set('offset', String(params.offset));
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
}
