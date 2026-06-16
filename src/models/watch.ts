/**
 * Watch category definitions for backend-derived watch groups.
 *
 * Each legacy `watchRepo` list is now derived from ticker/journal backend fields
 * per PRD section 2.1.8. Manual recording is supported only for categories
 * with a clear, singular backend update payload.
 */

import { TickerUpdateRequest, TickerState, TickerType } from './ticker';

// ── Category Identifier ──

/**
 * Stable semantic watch category identifier.
 * Replaces the legacy numeric `WatchCategoryIndex`.
 */
export enum WatchCategoryId {
  SET_JOURNAL = 'SET_JOURNAL',
  READY = 'READY',
  LONG_NSE = 'LONG_NSE',
  LONG_NON_NSE = 'LONG_NON_NSE',
  RUNNING = 'RUNNING',
  DEFAULT_DAILY = 'DEFAULT_DAILY',
  INDEX = 'INDEX',
  COMPOSITE = 'COMPOSITE',
  BLACKLISTED = 'BLACKLISTED',
}

// ── Category Definition ──

/**
 * A single watch category definition.
 */
export interface WatchCategory {
  /** Stable semantic identifier. */
  readonly id: WatchCategoryId;
  /** Display color name. */
  readonly color: string;
  /** Human-readable label. */
  readonly label: string;
  /**
   * Backend field update to record when a ticker is assigned to this category.
   * `null` means this category is not directly recordable (e.g. journal-derived).
   */
  readonly recordUpdate: TickerUpdateRequest | null;
}

// ── Classification Result ──

/**
 * Result of batch ticker classification — counts per watch category.
 * Uncategorized tickers are logged to console, only the count is returned.
 */
export interface BucketSummary {
  /** Ticker count per watch category ID. */
  readonly buckets: Map<WatchCategoryId, number>;
  /** Number of tickers that matched no watch category. */
  readonly uncategorizedCount: number;
}

// ── Canonical Category List ──

/**
 * All watch categories in UI paint order (matching Constants.UI.COLORS.DEFAULT).
 * List order: SET_JOURNAL, READY, LONG_NSE, LONG_NON_NSE, RUNNING, DEFAULT_DAILY, INDEX, COMPOSITE, BLACKLISTED
 */
// HACK: Change to Map fro both Watch and Flag Categories
export const ALL_WATCH_CATEGORIES: readonly WatchCategory[] = [
  {
    id: WatchCategoryId.SET_JOURNAL,
    color: 'orange',
    label: 'Set Trades (Journal)',
    recordUpdate: null, // Derived from journal status=SET; not directly recordable
  },
  {
    id: WatchCategoryId.READY,
    color: 'red',
    label: 'Ready',
    recordUpdate: { state: TickerState.READY },
  },
  {
    id: WatchCategoryId.LONG_NSE,
    color: 'dodgerblue',
    label: 'Long Watch (India)',
    recordUpdate: null, // Derived from timeframes; not directly recordable
  },
  {
    id: WatchCategoryId.LONG_NON_NSE,
    color: 'cyan',
    label: 'Long Watch (Non-India)',
    recordUpdate: null, // Derived from timeframes; not directly recordable
  },
  {
    id: WatchCategoryId.RUNNING,
    color: 'lime',
    label: 'Running Trades (Journal)',
    recordUpdate: null, // Derived from journal status=RUNNING; not directly recordable
  },
  {
    id: WatchCategoryId.DEFAULT_DAILY,
    color: 'white',
    label: 'Default / Daily',
    recordUpdate: null, // Derived from TV watchlist fallback; not directly recordable
  },
  {
    id: WatchCategoryId.INDEX,
    color: 'brown',
    label: 'Index',
    recordUpdate: { type: TickerType.INDEX },
  },
  {
    id: WatchCategoryId.COMPOSITE,
    color: 'darkkhaki',
    label: 'Composite',
    recordUpdate: null, // Code-derived; recording not currently supported
  },
  {
    id: WatchCategoryId.BLACKLISTED,
    color: 'dimgrey',
    label: 'Blacklisted',
    recordUpdate: { state: TickerState.BLACKLIST },
  },
] as const;
