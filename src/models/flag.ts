import { TickerUpdateRequest } from './ticker';

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
}

// ── Category Definitions ──

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
  },
  {
    id: 'DOWNTREND',
    index: 1,
    color: 'red',
    label: 'Downtrend / Shorts',
    update: { trend: 'DOWNTREND' },
  },
  {
    id: 'CRYPTO',
    index: 2,
    color: 'dodgerblue',
    label: 'Crypto',
    update: { type: 'CRYPTO' },
  },
  {
    id: 'UPTREND',
    index: 4,
    color: 'lime',
    label: 'Uptrend / Longs',
    update: { trend: 'UPTREND' },
  },
  {
    id: 'DEFAULT_UNTRACKED',
    index: 5,
    color: 'white',
    label: 'Default / Untracked',
    update: {},
  },
  {
    id: 'INDEX',
    index: 6,
    color: 'brown',
    label: 'Index / Markets',
    update: { type: 'INDEX' },
  },
  {
    id: 'GOLD_INDEX',
    index: 7,
    color: 'darkkhaki',
    label: 'Gold / Composite Index',
    update: { type: 'COMPOSITE' },
  },
] as const;
