/** Media variants a Seer detail page can expose for deletion. */
export enum SeerVariant {
  STANDARD = 'standard',
  FOUR_K = '4k',
}

/** Canonical detail path of a Seer page: `/movie/{tmdbId}` or `/tv/{id}`. */
export type SeerDetailPath = `/movie/${number}` | `/tv/${number}`;

/** Deletion target resolved from a Seer detail page. */
export interface SeerDeleteTarget {
  readonly mediaId: number;
  readonly variants: readonly SeerVariant[];
  readonly requestIds: readonly number[];
}
