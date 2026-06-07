/**
 * Watch category definitions for backend-derived watch groups.
 *
 * Each legacy `watchRepo` list is now derived from ticker/journal backend fields
 * per PRD section 2.1.8. Manual recording is supported only for categories
 * with a clear, singular backend update payload.
 */

import { TickerUpdateRequest } from './ticker';

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
 * Result of batch ticker classification — tickers grouped by watch category.
 */
export interface CategoryBuckets {
  /** Tickers grouped by watch category ID. */
  readonly buckets: Map<WatchCategoryId, Set<string>>;
  /** Tickers that matched no watch category. */
  readonly uncategorized: Set<string>;
}

// ── Canonical Category List ──

/**
 * All watch categories in UI paint order (matching Constants.UI.COLORS.LIST order).
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
    recordUpdate: { state: 'READY' },
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
    recordUpdate: { type: 'INDEX' },
  },
  {
    id: WatchCategoryId.COMPOSITE,
    color: 'darkkhaki',
    label: 'Composite',
    recordUpdate: null, // Code-derived; recording not currently supported
  },
  // FIXME: Add BLACKLISTED category with key binding (e.g. F9) and dark grey color
] as const;
