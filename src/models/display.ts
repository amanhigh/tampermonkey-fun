/**
 * Generic display state for a ticker's visual presentation.
 * Resolved by DisplayManager for both header name and alert feed rows.
 *
 * Priority order (surface-independent):
 *   1 UNMAPPED — no TV ticker mapping (null ticker / unmapped)
 *   2 WATCH_CATEGORY — has watch category AND is in the shared watchlist silo
 *   3 RECENT — recently viewed ticker (any non-null ticker)
 *   4 DEFAULT — everything else (white)
 */
export enum DisplayState {
  /** Ticker has no TV mapping */
  UNMAPPED = 'UNMAPPED',
  /** Mapped ticker with no stronger state — white fallback. */
  DEFAULT = 'DEFAULT',
  /** Recently viewed ticker. */
  RECENT = 'RECENT',
  /** Ticker has a watch category and is in the shared watchlist silo. */
  WATCH_CATEGORY = 'WATCH_CATEGORY',
}

/**
 * Resolved display information for a ticker.
 * Color is the final CSS color to apply.
 * State indicates the semantic category for logging/debugging.
 */
export interface DisplayInfo {
  state: DisplayState;
  color: string;
}
