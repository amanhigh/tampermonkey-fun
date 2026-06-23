import { ScreenshotResponse } from './os';
import { PaginationMetadata } from './api';

// ── Journal API Types ──

export type JournalType = 'REJECTED' | 'TAKEN';

export type JournalStatus = 'SET' | 'RUNNING' | 'SUCCESS' | 'FAIL' | 'MISSED' | 'JUST_LOSS' | 'BROKEN';

export type JournalSequence = 'MWD' | 'YR' | 'WDH';

export type JournalTimeframe = 'DL' | 'WK' | 'MN' | 'TMN' | 'SMN' | 'YR';

export type JournalTagType = 'REASON' | 'MANAGEMENT' | 'DIRECTION';

/** Result journal statuses available for user selection when recording a trade result. */
export type JournalResultStatus = 'SUCCESS' | 'FAIL' | 'MISSED';

export type JournalNoteFormat = 'MARKDOWN' | 'PLAINTEXT';

/**
 * Journal entry action types for UI button actions (SET, RESULT, REJECTED).
 * Note: the stored backend type uses JournalType above, not this enum.
 */
export enum JournalActionType {
  SET = 'set',
  RESULT = 'result',
  REJECTED = 'rejected',
}

export interface CreateJournalImageRequest {
  timeframe: JournalTimeframe;
  file_name: string;
}

export interface CreateJournalTagRequest {
  tag: string;
  type: JournalTagType;
  override?: string;
}

export interface CreateJournalNoteRequest {
  status: JournalStatus;
  content: string;
  format?: JournalNoteFormat;
}

export interface CreateJournalRequest {
  ticker: string;
  sequence: JournalSequence;
  type: JournalType;
  status: JournalStatus;
  images: CreateJournalImageRequest[];
  tags?: CreateJournalTagRequest[];
  notes?: CreateJournalNoteRequest[];
}

export interface CreateJournalInput {
  /** Trading symbol to create a journal for. */
  ticker: string;
  /** Reason code selected by the user. */
  reason: string;
  /** Captured screenshots to attach to the journal. */
  screenshots: ScreenshotResponse[];
  /** Journal API type to create. */
  type: JournalType;
  /** Journal API status to assign. */
  status: JournalStatus;
  /** Optional notes to attach on journal creation. */
  notes?: CreateJournalNoteRequest[];
}

export interface JournalImageRecord extends CreateJournalImageRequest {
  id: string;
  journal_id: string;
  created_at: string;
}

export interface JournalTagRecord {
  id: string;
  journal_id: string;
  tag: string;
  type: JournalTagType;
  override?: string;
  created_at: string;
}

export interface JournalNoteRecord {
  id: string;
  journal_id: string;
  status: JournalStatus;
  content: string;
  format: JournalNoteFormat;
  created_at: string;
}

/** Query parameters for listing journals. */
export interface JournalQueryParams {
  ticker?: string;
  type?: JournalType;
  status?: JournalStatus;
  limit?: number;
  offset?: number;
  'sort-by'?: string;
  'sort-order'?: string;
}

/** Paginated journal list response. */
export interface JournalListResponse {
  journals: JournalRecord[];
  metadata: PaginationMetadata;
}

/** Request body for updating a journal's status. */
export interface UpdateJournalStatusRequest {
  status: JournalResultStatus;
}

/** Response from updating journal status. */
export interface UpdateJournalStatusResponse {
  id: string;
  status: string;
  reviewed_at?: string;
}

export interface JournalRecord {
  id: string;
  ticker: string;
  sequence: JournalSequence;
  type: JournalType;
  status: JournalStatus;
  created_at: string;
  reviewed_at?: string;
  deleted_at?: string;
  images?: JournalImageRecord[];
  tags?: JournalTagRecord[];
  notes?: JournalNoteRecord[];
}
