/**
 * Generic display state for a ticker's visual presentation.
 * Resolved by DisplayManager for header name and alert feed.
 *
 * Priority order:
 *   1 UNMAPPED — no TV ticker mapping (alert feed only)
 *   2 WATCH_CATEGORY — has watch category and is in DOM watchlist
 *   3 RECENT — recently viewed (alert feed only)
 *   4 DEFAULT — everything else
 */
export enum DisplayState {
  /** Ticker has no TV mapping — only applies to alert feed rows. */
  UNMAPPED = 'UNMAPPED',
  /** Mapped ticker with no stronger state — white fallback. */
  DEFAULT = 'DEFAULT',
  /** Recently viewed ticker — only applies to alert feed rows. */
  RECENT = 'RECENT',
  /** Ticker has a watch category and is in the DOM watchlist. */
  WATCH_CATEGORY = 'WATCH_CATEGORY',
}

/**
 * The surface context where a ticker's display info is being resolved.
 * Restricted to surfaces that need semantic display state.
 * Watchlist/screener symbols paint directly from watch category.
 */
export enum DisplaySurface {
  /** Current ticker header name element. */
  HEADER_NAME = 'HEADER_NAME',
  /** Investing.com alert feed row. */
  ALERT_FEED_ROW = 'ALERT_FEED_ROW',
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

/**
 * Request payload for DisplayManager.resolve().
 * Only ticker and surface are passed; all lookups are internal.
 */
export interface DisplayRequest {
  ticker: string | null;
  surface: DisplaySurface;
}

/**
 * Default color per display state.
 * WATCH_CATEGORY is excluded because its color comes from the actual watch category.
 */
export const DISPLAY_STATE_COLORS: { [K in DisplayState]?: string } = {
  [DisplayState.UNMAPPED]: 'red',
  [DisplayState.DEFAULT]: 'white',
  [DisplayState.RECENT]: 'lime',
};
