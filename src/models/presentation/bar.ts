/**
 * Shared BEM block class applied to every bar root element.
 * Individual bar block classes (from {@link BarId}) are added alongside this class.
 */
export const BAR_CLASS = 'aman-bar';

/** Shared BEM element class for the optional indicator marker rendered by opted-in bars. */
export const BAR_INDICATORS_CLASS = 'aman-bar__indicators';

/** Shared BEM element class for indicator badges applied inside already-rendered bar content. */
export const BAR_INDICATOR_BADGE_CLASS = 'aman-bar__badge';

/**
 * Visual status of a bar, mapped to a BEM modifier on the root element.
 */
export enum BarStatus {
  /** Normal / healthy state. Modifier: `aman-bar--ok`. */
  OK = 'ok',
  /** Warning state. Modifier: `aman-bar--warn`. */
  WARN = 'warn',
  /** Error state. Modifier: `aman-bar--error`. */
  ERROR = 'error',
}

/**
 * Lifecycle state of a bar's optional indicators, mapped to the
 * `aman-bar--indicators-{state}` modifier on the root element.
 */
export enum BarIndicatorState {
  /** Optional indicators are loading. A small marker is shown while mandatory content is visible. */
  LOADING = 'loading',
  /** Optional indicators loaded and were applied in place. */
  READY = 'ready',
  /** Optional indicators could not be loaded. The bar is marked quietly, without business status changes. */
  UNAVAILABLE = 'unavailable',
}

/**
 * In-place decoration for one already-rendered bar element.
 *
 * `selector` is resolved inside the bar root only, and the target chip/button
 * node is never replaced — only its badge text and native title are updated.
 */
export interface BarIndicatorUpdate {
  /** jQuery selector, scoped to the bar root, of the chip/button to decorate. */
  readonly selector: string;
  /** Plain-text badge. An empty string removes the badge. */
  readonly badge: string;
  /** Native `title` applied to the decorated element. */
  readonly title: string;
}

/**
 * Unique identifiers for bar UI components.
 *
 * Each `BarId` value serves as the root element ID and the basis for
 * BEM block-class derivation inside {@link BaseBar}.
 */
export enum BarId {
  /** Alert ticker bar — displays linked alert ticker status. */
  ALERT = 'aman-alert-ticker-bar',
  /** Alert summary bar — compact pill display of alert prices relative to LTP. */
  ALERT_SUMMARY = 'aman-alerts',
  /** Timeframe bar — displays recommended timeframe chips for the current ticker. */
  TIMEFRAME = 'aman-tf-bar',
  /** Watchlist bar — compact chip display of watch categories with filter controls. */
  WATCHLIST = 'aman-watchlist-bar',
}
