import { ISeerClient } from '../client/seer';
import { ApiError } from '../models/api_error';
import { SeerDeleteTarget, SeerDetailPath } from '../models/seer';

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
    return DETAIL_ROUTE_PATTERN.test(pathname);
  }

  /** @inheritdoc */
  async deleteMedia(pathname: string): Promise<void> {
    const target = await this.client.getDeleteTarget(SeerManager.canonicalDetailPath(pathname));
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

  /** Canonicalize a detail route to `/movie/{id}` or `/tv/{id}`, rejecting anything else. */
  private static canonicalDetailPath(pathname: string): SeerDetailPath {
    const match = DETAIL_ROUTE_PATTERN.exec(pathname);
    if (!match) {
      throw new Error(`Unsupported Seer route: ${pathname}`);
    }
    return `/${match[1]}/${match[2]}` as SeerDetailPath;
  }
}

/** Detail routes that can expose a deletion target. */
const DETAIL_ROUTE_PATTERN = /^\/(movie|tv)\/([1-9]\d*)(?:\/|$)/;

/** Read a human readable message from an unknown error. */
function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
