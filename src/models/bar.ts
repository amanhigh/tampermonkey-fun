/**
 * Shared BEM block class applied to every bar root element.
 * Individual bar block classes (from {@link BarId}) are added alongside this class.
 */
export const BAR_CLASS = 'aman-bar';

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
}
