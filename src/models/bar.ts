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
