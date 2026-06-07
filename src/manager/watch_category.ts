import { Ticker } from '../models/ticker';
import { Constants } from '../models/constant';
import { ALL_WATCH_CATEGORIES, WatchCategory, WatchCategoryId } from '../models/watch';

// ── Lookup ──

/**
 * Look up a watch category by its semantic ID.
 * @throws If no category exists for the given ID
 */
export function findWatchCategoryById(id: WatchCategoryId): WatchCategory {
  const cat = ALL_WATCH_CATEGORIES.find((c) => c.id === id);
  if (!cat) {
    throw new Error(`Invalid watch category id: ${id}`);
  }
  return cat;
}

// ── Ticker classification helpers ──

/**
 * Check whether a ticker's timeframes make it a long-watch candidate
 * (does not contain DL).
 */
function isLongWatch(ticker: Ticker): boolean {
  return !ticker.timeframes.includes('DL');
}

/**
 * Check whether a ticker is India-listed based on exchange.
 */
function isIndiaExchange(ticker: Ticker): boolean {
  return ticker.exchange === 'NSE';
}

// ── Resolver ──

/**
 * Resolve a single ticker to its watch category ID based on backend fields only.
 * Does NOT resolve DEFAULT_DAILY — callers must apply that fallback when the
 * ticker is present in the TV watchlist.
 *
 * Returns undefined if the ticker does not match any backend-derived category.
 */
export function resolveWatchCategory(ticker: Ticker): WatchCategoryId | undefined {
  // READY
  if (ticker.state === 'READY') {
    return WatchCategoryId.READY;
  }

  // Explicit types take priority over timeframe-based classification
  // to prevent COMPOSITE/INDEX tickers without DL from being misclassified as LONG_*

  // Composite instruments
  if (ticker.type === 'COMPOSITE') {
    return WatchCategoryId.COMPOSITE;
  }

  // Market instruments
  if (Constants.FLAGS.INDEX_TICKER_TYPES.includes(ticker.type)) {
    return WatchCategoryId.INDEX;
  }

  // Long-watch (timeframes no DL), split by exchange
  if (isLongWatch(ticker)) {
    return isIndiaExchange(ticker) ? WatchCategoryId.LONG_NSE : WatchCategoryId.LONG_NON_NSE;
  }

  // No match — caller should apply DEFAULT_DAILY fallback
  return undefined;
}
