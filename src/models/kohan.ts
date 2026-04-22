export type ScreenshotType = 'FULL' | 'REGION';

export type JournalApiType = 'REJECTED' | 'TAKEN';

export type JournalApiStatus = 'SET' | 'RUNNING' | 'SUCCESS' | 'FAIL' | 'MISSED' | 'JUST_LOSS' | 'BROKEN';

export type JournalApiSequence = 'MWD' | 'YR' | 'WDH';

export type JournalApiTimeframe = 'DL' | 'WK' | 'MN' | 'TMN' | 'SMN' | 'YR';

export type JournalTagType = 'REASON' | 'MANAGEMENT' | 'DIRECTION';

export type JournalNoteFormat = 'MARKDOWN' | 'PLAINTEXT';

export interface KohanEnvelope<T> {
  status: 'success' | 'fail' | 'error';
  data: T;
}

export interface ScreenshotRequest {
  file_name: string;
  save_path: string;
  type: ScreenshotType;
  window?: string;
  notify?: boolean;
}

export interface ScreenshotResponse {
  file_name: string;
  relative_path: string;
  full_path: string;
}

export interface CreateJournalImageRequest {
  timeframe: JournalApiTimeframe;
  file_name: string;
}

export interface CreateJournalTagRequest {
  tag: string;
  type: JournalTagType;
  override?: string;
}

export interface CreateJournalNoteRequest {
  status: JournalApiStatus;
  content: string;
  format?: JournalNoteFormat;
}

export interface CreateJournalRequest {
  ticker: string;
  sequence: JournalApiSequence;
  type: JournalApiType;
  status: JournalApiStatus;
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
  status: JournalApiStatus;
  content: string;
  format: JournalNoteFormat;
  created_at: string;
}

export interface JournalRecord {
  id: string;
  ticker: string;
  sequence: JournalApiSequence;
  type: JournalApiType;
  status: JournalApiStatus;
  created_at: string;
  reviewed_at?: string;
  deleted_at?: string;
  images?: JournalImageRecord[];
  tags?: JournalTagRecord[];
  notes?: JournalNoteRecord[];
}
