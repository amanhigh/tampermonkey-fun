import { ISeerClient } from '../client/seer';
import { ApiError } from '../models/api_error';
import { SeerDeleteTarget } from '../models/seer';
import { canonicalSeerDetailPath, isSeerDetailPage } from '../util/seer';

/**
 * ISeerManager recognizes Seer detail routes and deletes their library entries.
 */
export interface ISeerManager {
  /**
   * Report whether a browser pathname belongs to a Seer movie or tv detail page.
   * @param pathname - Browser pathname of the page
   * @returns True for a movie or tv detail route, including nested season routes
   */
  isDetailPage(pathname: string): boolean;

  /**
<<<<<<< HEAD
   * Report whether the Seer page has a media record, without changing anything.
   * @param pathname - Browser pathname of the page
   * @returns Promise resolving with true when the page has a valid media record
   */
  hasMediaRecord(pathname: string): Promise<boolean>;

  /**
   * Resolve the human readable title of the page.
   * @param pathname - Browser pathname of the page
   * @returns Promise resolving with the first usable title of the page
   */
  getMediaTitle(pathname: string): Promise<string>;

  /**
=======
>>>>>>> master
   * Delete the files, requests and media entry of the page.
   * @param pathname - Browser pathname captured when the deletion was confirmed
   * @returns Promise resolving once every deletion step succeeded
   */
  deleteMedia(pathname: string): Promise<void>;
}

/**
 * SeerManager maps Seer routes to fresh deletion targets and runs the deletion
 * steps: files first, then requests, then the media entry last.
 */
export class SeerManager implements ISeerManager {
  constructor(private readonly client: ISeerClient) {}

  /** @inheritdoc */
  isDetailPage(pathname: string): boolean {
    return isSeerDetailPage(pathname);
  }

  /** @inheritdoc */
<<<<<<< HEAD
  async hasMediaRecord(pathname: string): Promise<boolean> {
    return this.client.hasMediaRecord(canonicalSeerDetailPath(pathname));
  }

  /** @inheritdoc */
  async getMediaTitle(pathname: string): Promise<string> {
    return this.client.getSearchTitle(canonicalSeerDetailPath(pathname));
  }

  /** @inheritdoc */
=======
>>>>>>> master
  async deleteMedia(pathname: string): Promise<void> {
    const target = await this.client.getDeleteTarget(canonicalSeerDetailPath(pathname));
    await this.removeFiles(target);
    await this.removeRecords(target);
  }

  /** Delete every variant, rejecting with the aggregate when any variant failed. */
  private async removeFiles(target: SeerDeleteTarget): Promise<void> {
    const failures: string[] = [];
    for (const variant of target.variants) {
      try {
        await this.client.deleteFiles(target.mediaId, variant);
      } catch (error) {
        failures.push(`${variant} files: ${toMessage(error)}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(`Seer file deletion failed: ${failures.join('; ')}`);
    }
  }

  /** Delete the requests first and the media entry last, rejecting with the aggregate. */
  private async removeRecords(target: SeerDeleteTarget): Promise<void> {
    const failures: string[] = [];
    for (const requestId of target.requestIds) {
      try {
        await this.client.deleteRequest(requestId);
      } catch (error) {
        if (!ApiError.isNotFoundError(error)) {
          failures.push(`request ${requestId}: ${toMessage(error)}`);
        }
      }
    }
    try {
      await this.client.deleteMedia(target.mediaId);
    } catch (error) {
      if (!ApiError.isNotFoundError(error)) {
        failures.push(`media ${target.mediaId}: ${toMessage(error)}`);
      }
    }
    if (failures.length > 0) {
      throw new Error(`Seer record deletion failed: ${failures.join('; ')}`);
    }
  }
}

/** Read a human readable message from an unknown error. */
function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
