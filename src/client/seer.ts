import { BaseClient, IBaseClient } from './base';
import { Constants } from '../models/constant';
import { SeerDeleteTarget, SeerDetailPath, SeerVariant } from '../models/seer';

/**
 * SeerClient deletes media, files and requests through the Seerr API.
 */
export interface ISeerClient extends IBaseClient {
  /**
   * Resolve the deletion target of a Seer detail page.
   * @param detailPath - Canonical detail path, `/movie/{tmdbId}` or `/tv/{id}`
   * @returns Promise resolving with the deletion target of the page
   */
  getDeleteTarget(detailPath: SeerDetailPath): Promise<SeerDeleteTarget>;

  /**
   * Report whether a Seer detail page carries a media record.
   * @param detailPath - Canonical detail path, `/movie/{tmdbId}` or `/tv/{id}`
   * @returns Promise resolving with true when the page has a valid media record
   */
  hasMediaRecord(detailPath: SeerDetailPath): Promise<boolean>;

  /**
   * Resolve the Airtel Xstream search title of a Seer detail page.
   * @param detailPath - Canonical detail path, `/movie/{tmdbId}` or `/tv/{id}`
   * @returns Promise resolving with the first usable title of the page
   */
  getSearchTitle(detailPath: SeerDetailPath): Promise<string>;

  /**
   * Delete the downloaded files of one variant.
   * @param mediaId - Positive Seer media id
   * @param variant - Variant whose files are removed
   * @returns Promise resolving once the API accepts the deletion
   */
  deleteFiles(mediaId: number, variant: SeerVariant): Promise<void>;

  /**
   * Delete a single request.
   * @param requestId - Positive Seer request id
   * @returns Promise resolving once the API accepts the deletion
   */
  deleteRequest(requestId: number): Promise<void>;

  /**
   * Delete the media entry itself.
   * @param mediaId - Positive Seer media id
   * @returns Promise resolving once the API accepts the deletion
   */
  deleteMedia(mediaId: number): Promise<void>;
}

/**
 * SeerClient talks to the Seerr API through the shared BaseClient transport.
 */
export class SeerClient extends BaseClient implements ISeerClient {
  /**
   * Creates an instance of SeerClient.
   * @param baseUrl - Base URL for the Seerr API (defaults to Constants.SEER.BASE_URL)
   */
  constructor(baseUrl: string = Constants.SEER.BASE_URL) {
    super(baseUrl);
  }

  /** @inheritdoc */
  async getDeleteTarget(detailPath: SeerDetailPath): Promise<SeerDeleteTarget> {
    const payload = await this.makeRequest<unknown>(detailPath);
    return this.decodeDeleteTarget(payload, detailPath);
  }

  /** @inheritdoc */
  async hasMediaRecord(detailPath: SeerDetailPath): Promise<boolean> {
    const payload = await this.makeRequest<unknown>(detailPath);
    const detail = toRecord(payload, 'detail response');
    const rawMedia = detail.mediaInfo;
    if (rawMedia === undefined || rawMedia === null) {
      return false;
    }
    const media = toRecord(rawMedia, 'mediaInfo');
    if (media.id === undefined || media.id === null) {
      return false;
    }
    toPositiveInteger(media.id, 'media id');
    return true;
  }

  /** @inheritdoc */
  async getSearchTitle(detailPath: SeerDetailPath): Promise<string> {
    const payload = await this.makeRequest<unknown>(detailPath);
    return this.decodeSearchTitle(payload, detailPath);
  }

  /** @inheritdoc */
  async deleteFiles(mediaId: number, variant: SeerVariant): Promise<void> {
    const id = assertPositiveInteger(mediaId, 'media id');
    const is4k = variant === SeerVariant.FOUR_K;
    await this.makeRequest<unknown>(`/media/${id}/file?is4k=${is4k}`, { method: 'DELETE' });
  }

  /** @inheritdoc */
  async deleteRequest(requestId: number): Promise<void> {
    const id = assertPositiveInteger(requestId, 'request id');
    await this.makeRequest<unknown>(`/request/${id}`, { method: 'DELETE' });
  }

  /** @inheritdoc */
  async deleteMedia(mediaId: number): Promise<void> {
    const id = assertPositiveInteger(mediaId, 'media id');
    await this.makeRequest<unknown>(`/media/${id}`, { method: 'DELETE' });
  }

  /** Decode the fields needed for deletion from a detail response. */
  private decodeDeleteTarget(payload: unknown, detailPath: SeerDetailPath): SeerDeleteTarget {
    const detail = toRecord(payload, 'detail response');
    const rawMedia = detail.mediaInfo;
    if (rawMedia === undefined || rawMedia === null) {
      throw new Error(`No Seer media record for ${detailPath}`);
    }

    const media = toRecord(rawMedia, 'mediaInfo');
    const requestIds: number[] = [];
    const requestVariants = new Set<SeerVariant>();
    const rawRequests = media.requests;
    if (rawRequests !== undefined && rawRequests !== null) {
      if (!Array.isArray(rawRequests)) {
        throw new Error('Malformed Seer requests');
      }
      for (const entry of rawRequests) {
        const request = toRecord(entry, 'request');
        requestIds.push(toPositiveInteger(request.id, 'request id'));
        requestVariants.add(request.is4k === true ? SeerVariant.FOUR_K : SeerVariant.STANDARD);
      }
    }

    return {
      mediaId: toPositiveInteger(media.id, 'media id'),
      variants: inferVariants(media, requestVariants),
      requestIds: [...new Set(requestIds)],
    };
  }

  /** Decode the first usable search title from a detail response. */
  private decodeSearchTitle(payload: unknown, detailPath: SeerDetailPath): string {
    const detail = toRecord(payload, 'detail response');
    const fields = detailPath.startsWith('/movie') ? MOVIE_TITLE_FIELDS : TV_TITLE_FIELDS;
    for (const field of fields) {
      const value = detail[field];
      if (typeof value !== 'string') {
        continue;
      }
      const title = value.trim();
      if (title.length > 0) {
        return title;
      }
    }
    throw new Error(`No Seer title for ${detailPath}`);
  }
}

/** Title fields of a movie detail response, in fallback order. */
const MOVIE_TITLE_FIELDS = ['title', 'originalTitle'] as const;

/** Title fields of a tv detail response, in fallback order. */
const TV_TITLE_FIELDS = ['name', 'originalName'] as const;

/** Narrow an unknown value to a record or reject it as malformed. */
function toRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Malformed Seer ${label}`);
  }
  return value as Record<string, unknown>;
}

/** Assert a value is a positive integer. */
function assertPositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid Seer ${label}: ${String(value)}`);
  }
  return value;
}

/** Read a positive integer field or reject it as malformed. */
function toPositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Malformed Seer ${label}`);
  }
  return assertPositiveInteger(value, label);
}

/**
 * True when a decoded field carries a recorded value: `0` counts, `undefined`
 * and `null` do not.
 */
function isRecorded(value: unknown): boolean {
  return value !== undefined && value !== null;
}

/** Infer available variants from service metadata and accumulated request variants. */
function inferVariants(media: Record<string, unknown>, requestVariants: ReadonlySet<SeerVariant>): SeerVariant[] {
  const variants: SeerVariant[] = [];
  const hasStandard =
    isRecorded(media.serviceId) ||
    isRecorded(media.externalServiceId) ||
    Boolean(media.serviceUrl) ||
    requestVariants.has(SeerVariant.STANDARD);
  if (hasStandard) {
    variants.push(SeerVariant.STANDARD);
  }
  const hasFourK =
    isRecorded(media.serviceId4k) ||
    isRecorded(media.externalServiceId4k) ||
    Boolean(media.serviceUrl4k) ||
    requestVariants.has(SeerVariant.FOUR_K);
  if (hasFourK) {
    variants.push(SeerVariant.FOUR_K);
  }
  return variants;
}
