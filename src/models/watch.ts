/**
 * Watch category definitions for backend-derived watch groups.
 *
 * Each legacy `watchRepo` list is now derived from ticker/journal backend fields
 * per PRD section 2.1.8. Manual recording is supported only for categories
 * with a clear, singular backend update payload.
 */

import { Ticker, TickerUpdateRequest } from './ticker';
import { JournalRecord } from './journal';

// ── Category Identifier ──

/**
 * Watch category index type (0-7 matching legacy color order).
 */
export type WatchCategoryIndex = number;

// ── Category Definition ──

/**
 * A single watch category definition.
 */
export interface WatchCategory {
  /** Category index (0-7), matching Constants.UI.COLORS.LIST order. */
  readonly index: WatchCategoryIndex;
  /** Display color name. */
  readonly color: string;
  /** Human-readable label. */
  readonly label: string;
  /**
   * Backend update payload when a ticker is manually recorded into this category.
   * `null` means manual recording is not supported for this category.
   */
  readonly recordUpdate: TickerUpdateRequest | null;
}

// ── Canonical Category List ──

/**
 * All watch categories in UI paint order (0-7).
 */
export const ALL_WATCH_CATEGORIES: readonly WatchCategory[] = [
  {
    index: 0,
    color: 'orange',
    label: 'Set Trades (Journal)',
    recordUpdate: null, // Derived from journal status=SET; not directly recordable
  },
  {
    index: 1,
    color: 'red',
    label: 'Ready',
    recordUpdate: { state: 'READY' },
  },
  {
    index: 2,
    color: 'dodgerblue',
    label: 'Long Watch (India)',
    recordUpdate: null, // Derived from timeframes; not directly recordable
  },
  {
    index: 3,
    color: 'cyan',
    label: 'Long Watch (Non-India)',
    recordUpdate: null, // Derived from timeframes; not directly recordable
  },
  {
    index: 4,
    color: 'lime',
    label: 'Running Trades (Journal)',
    recordUpdate: null, // Derived from journal status=RUNNING; not directly recordable
  },
  {
    index: 5,
    color: 'white',
    label: 'Default / Daily',
    recordUpdate: null, // Derived from timeframes; not directly recordable
  },
  {
    index: 6,
    color: 'brown',
    label: 'Index',
    recordUpdate: { type: 'INDEX' },
  },
  {
    index: 7,
    color: 'darkkhaki',
    label: 'Composite',
    recordUpdate: null, // Code-derived; recording not currently supported
  },
] as const;

/** Total number of watch categories. */
export const WATCH_CATEGORY_COUNT: number = ALL_WATCH_CATEGORIES.length;

// ── Derivation Helpers ──

/**
 * Check whether a ticker's timeframes make it a long-watch candidate
 * (does not contain DL).
 */
export function isLongWatch(ticker: Ticker): boolean {
  return !ticker.timeframes.includes('DL');
}

/**
 * Check whether a ticker's timeframes include daily (DL).
 */
export function isDailyWatch(ticker: Ticker): boolean {
  return ticker.timeframes.includes('DL');
}

/**
 * Check whether a ticker is India-listed based on exchange.
 */
export function isIndiaExchange(ticker: Ticker): boolean {
  return ticker.exchange === 'NSE';
}

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
