/**
 * Generic display state for a ticker's visual presentation.
 * Resolved by DisplayManager for both header name and alert feed rows.
 *
 * Priority order:
 *   1 UNMAPPED — no backend alert ticker mapping (null ticker)
 *   2 WATCH_CATEGORY — has watch category AND is in the shared watchlist silo
 *   3 RECENT — recently opened ticker (gold)
 *   4 DEFAULT — mapped ticker fallback (white)
 */
export enum DisplayState {
  /** No backend alert ticker mapping — purple. */
  UNMAPPED = 'UNMAPPED',
  /** Mapped ticker with no stronger state — white fallback. */
  DEFAULT = 'DEFAULT',
  /** Recently opened ticker. */
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
