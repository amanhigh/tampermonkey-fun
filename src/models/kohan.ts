export type ScreenshotType = 'FULL' | 'REGION';

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
