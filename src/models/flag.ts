import { Ticker, TickerUpdateRequest } from './ticker';
import { Constants } from './constant';

/**
 * Category identifier for flag classification.
 * Each category maps to a display color and a backend field update.
 */
export type FlagCategoryId =
  | 'SIDEWAYS'
  | 'DOWNTREND'
  | 'CRYPTO'
  | 'UPTREND'
  | 'DEFAULT_UNTRACKED'
  | 'INDEX'
  | 'GOLD_INDEX';

/**
 * A first-class flag category definition.
 *
 * Each instance knows its:
 * - `id`            — semantic identifier
 * - `index`         — legacy numeric index (also the sort order for painting)
 * - `color`         — CSS color name used for flag painting
 * - `label`         — human-readable description
 * - `update`        — backend field update when a ticker is assigned to this category
 * - `matches`       — predicate to decide whether a ticker belongs to this category
 */
export interface FlagCategory {
  /** Semantic identifier (e.g. "GOLD_INDEX", "UPTREND"). */
  id: FlagCategoryId;

  /** Legacy numeric index. Also the UI paint order. */
  index: number;

  /** CSS color name (e.g. "lime", "brown"). */
  color: string;

  /** Human-readable label. */
  label: string;

  /**
   * Backend field update applied when a ticker is recorded into this category.
   * Set to `{}` (no-op) for categories like DEFAULT_UNTRACKED that do not
   * persist meaningful data to the backend.
   */
  update: TickerUpdateRequest;

  /**
   * Predicate that determines whether a ticker belongs to this category.
   * @param ticker Full ticker record from the backend
   */
  matches: (ticker: Ticker) => boolean;
}

// ── Category Definitions ──

/** Ticker types that classify as "Index / Markets" (INDEX category). */
const INDEX_TICKER_TYPES: readonly string[] = ['INDEX', 'COMMODITY', 'FX', 'BOND'] as const;

/**
 * All flag categories in UI paint order (by index).
 * This is the canonical list used by the FlagManager for paint, record, and lookup.
 */
export const ALL_FLAG_CATEGORIES: readonly FlagCategory[] = [
  {
    id: 'SIDEWAYS',
    index: 0,
    color: 'orange',
    label: 'Sideways / Consolidation',
    update: { trend: 'SIDEWAYS' },
    matches: (ticker) => ticker.trend === 'SIDEWAYS',
  },
  {
    id: 'DOWNTREND',
    index: 1,
    color: 'red',
    label: 'Downtrend / Shorts',
    update: { trend: 'DOWNTREND' },
    matches: (ticker) => ticker.trend === 'DOWNTREND',
  },
  {
    id: 'CRYPTO',
    index: 2,
    color: 'dodgerblue',
    label: 'Crypto',
    update: { type: 'CRYPTO' },
    matches: (ticker) => ticker.type === 'CRYPTO',
  },
  {
    id: 'UPTREND',
    index: 4,
    color: 'lime',
    label: 'Uptrend / Longs',
    update: { trend: 'UPTREND' },
    matches: (ticker) => ticker.trend === 'UPTREND',
  },
  {
    id: 'DEFAULT_UNTRACKED',
    index: 5,
    color: 'white',
    label: 'Default / Untracked',
    update: {},
    matches: () => false,
  },
  {
    id: 'INDEX',
    index: 6,
    color: 'brown',
    label: 'Index / Markets',
    update: { type: 'INDEX' },
    matches: (ticker) => INDEX_TICKER_TYPES.includes(ticker.type),
  },
  {
    id: 'GOLD_INDEX',
    index: 7,
    color: 'darkkhaki',
    label: 'Gold / Composite Index',
    update: { type: 'COMPOSITE' },
    matches: (ticker) => ticker.type === 'COMPOSITE' && isGoldIndexSymbol(ticker.ticker),
  },
] as const;

// ── Helpers ──

/**
 * Check whether a ticker symbol is gold-index related.
 * Uses Constants.COMPOSITE.SPECIAL_TICKERS for the known matching symbols.
 */
function isGoldIndexSymbol(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  return Constants.COMPOSITE.SPECIAL_TICKERS.some((s) => upper.includes(s));
}

/**
 * Look up a flag category by its numeric index.
 * @param index Numeric category index
 * @returns The matching FlagCategory, or undefined if not found
 */
export function findFlagCategoryByIndex(index: number): FlagCategory | undefined {
  return ALL_FLAG_CATEGORIES.find((c) => c.index === index);
}

/**
 * Look up a flag category by its semantic ID.
 * @param id Category ID (e.g. 'GOLD_INDEX', 'UPTREND')
 * @returns The matching FlagCategory, or undefined if not found
 */
function findFlagCategoryById(id: FlagCategoryId): FlagCategory | undefined {
  return ALL_FLAG_CATEGORIES.find((c) => c.id === id);
}

/**
 * Priority-ordered list of category IDs used by resolveFlagCategory().
 *
 * Order: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND
 */
const FLAG_CATEGORY_PRIORITY: readonly FlagCategoryId[] = [
  'GOLD_INDEX',
  'INDEX',
  'CRYPTO',
  'UPTREND',
  'SIDEWAYS',
  'DOWNTREND',
] as const;

/**
 * Find the highest-priority flag category for a ticker.
 * Falls back to DEFAULT_UNTRACKED if no other category matches.
 *
 * Priority order: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND
 *
 * @param ticker Full ticker record
 * @returns The matching FlagCategory (always one of the defined categories)
 */
export function resolveFlagCategory(ticker: Ticker): FlagCategory {
  for (const id of FLAG_CATEGORY_PRIORITY) {
    const cat = findFlagCategoryById(id);
    if (cat?.matches(ticker)) {
      return cat;
    }
  }
  return findFlagCategoryById('DEFAULT_UNTRACKED')!;
}
