/** Media variants a Seer detail page can expose for deletion. */
export enum SeerVariant {
  STANDARD = 'standard',
  FOUR_K = '4k',
}

/** Deletion target resolved from a Seer detail page. */
export interface SeerDeleteTarget {
  readonly mediaId: number;
  readonly variants: readonly SeerVariant[];
  readonly requestIds: readonly number[];
}
