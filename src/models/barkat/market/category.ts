import { WatchCategory } from './watch';
import { FlagCategory } from './flag';

/**
 * Supplemental ticker annotations, independent of watch and flag categories.
 */
export enum TickerTag {
  /** Saved timeframes are missing the yearly (YR) timeframe. */
  TIMEFRAME_PENDING = 'TIMEFRAME_PENDING',

  /** Ticker is an F&O (Futures & Options) symbol. */
  FNO = 'FNO',
}

/**
 * Unified result of ticker category classification.
 *
 * All fields are resolved from the same backend ticker record.
 * Either field may be undefined when the ticker does not match
 * any category of that type.
 */
export interface TickerCategory {
  /** Watchlist-relevant category (RUNNING, READY, LONG_NSE, etc.). */
  readonly watch: WatchCategory | undefined;

  /** Flag/trend-based category (SIDEWAYS, UPTREND, CRYPTO, etc.). */
  readonly flag: FlagCategory | undefined;

  /**
   * Supplemental annotation tags for the ticker.
   * Always present — empty when the ticker carries no annotations.
   */
  readonly tags: readonly TickerTag[];
}
