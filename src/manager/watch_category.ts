import { Ticker } from '../models/ticker';
import { Constants } from '../models/constant';
import { JournalRecord } from '../models/journal';
import { ALL_WATCH_CATEGORIES, WatchCategory } from '../models/watch';

// ── Lookup ──

/**
 * Look up a watch category by its numeric index (0-7).
 * @throws If no category exists for the given index
 */
export function findWatchCategoryByIndex(index: number): WatchCategory {
  const cat = ALL_WATCH_CATEGORIES.find((c) => c.index === index);
  if (!cat) {
    throw new Error(`Invalid watch category index: ${index}`);
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

// ── Journal helpers ──

/**
 * Get the set of ticker symbols from journal records.
 */
export function journalTickerSet(journals: JournalRecord[]): Set<string> {
  const tickers = new Set<string>();
  for (const journal of journals) {
    tickers.add(journal.ticker);
  }
  return tickers;
}

// ── Resolver ──

/**
 * Resolve a single ticker to its watch category index.
 * Returns undefined if the ticker does not match any category
 * (the caller should assign it to the default/category 5).
 */
export function resolveWatchCategory(ticker: Ticker): number | undefined {
  // Category 1: state READY
  if (ticker.state === 'READY') {
    return 1;
  }

  // Categories 2 & 3: long-watch (timeframes no DL), split by exchange
  if (isLongWatch(ticker)) {
    return isIndiaExchange(ticker) ? 2 : 3;
  }

  // Category 6: market instruments
  if (Constants.FLAGS.INDEX_TICKER_TYPES.includes(ticker.type)) {
    return 6;
  }

  // Category 7: composite instruments
  if (ticker.type === 'COMPOSITE') {
    return 7;
  }

  // Category 5: fallback — no match
  return undefined;
}
