import { BaseClient, IBaseClient } from './base';
import { KohanEnvelope, ScreenshotRequest, ScreenshotResponse } from '../models/kohan';
import { Constants } from '../models/constant';

/**
 * OsClient handles OS-level operations against the local Kohan API:
 * screenshots, clipboard, and keyboard submap control.
 */
export interface IOsClient extends IBaseClient {
  /**
   * Take a screenshot via the OS API.
   * @param request - Screenshot request payload
   * @returns Promise resolving with captured screenshot metadata
   */
  screenshot(request: ScreenshotRequest): Promise<ScreenshotResponse>;

  /**
   * Retrieve clipboard data from the OS API.
   * @returns Promise resolving with clipboard text
   */
  getClip(): Promise<string>;

  /**
   * Enable a keyboard submap (e.g. 'swiftkeys').
   * @param submap - Submap name to enable
   */
  enableSubmap(submap: string): Promise<void>;

  /**
   * Disable a keyboard submap.
   * @param submap - Submap name to disable
   */
  disableSubmap(submap: string): Promise<void>;
}

/**
 * OsClient handles OS-level operations against the local Kohan API.
 */
export class OsClient extends BaseClient implements IOsClient {
  /**
   * Creates an instance of OsClient.
   * @param baseUrl - Base URL for Kohan API
   */
  constructor(baseUrl: string = Constants.KOHAN.BASE_URL) {
    super(baseUrl);
  }

  /** @inheritdoc */
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
  async getClip(): Promise<string> {
    try {
      return await this.makeRequest<string>('/os/clip/');
    } catch (error) {
      throw new Error(`Failed to get clip: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
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

  /** @inheritdoc */
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
