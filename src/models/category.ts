import { WatchCategory } from './watch';
import { FlagCategory } from './flag';

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

  /** Whether the ticker is an F&O (Futures & Options) symbol. */
  readonly isFno: boolean;
}
