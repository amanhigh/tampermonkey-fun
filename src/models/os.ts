import { JournalApiTimeframe } from './journal';

// ── OS / Screenshot Types ──

export type ScreenshotType = 'FULL' | 'REGION';

export type ScreenshotDirectoryType = 'JOURNAL' | 'DOWNLOAD';

export interface ScreenshotRequest {
  file_name: string;
  directory_type: ScreenshotDirectoryType;
  type: ScreenshotType;
  window?: string;
  notify?: boolean;
}

export interface ScreenshotResponse {
  file_name: string;
  full_path: string;
  timeframe?: JournalApiTimeframe;
}
