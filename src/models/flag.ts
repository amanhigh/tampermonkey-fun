import { TickerUpdateRequest } from './ticker';

/**
 * Category identifier enum for flag classification.
 * Each category maps to a display color and a backend field update.
 */
export enum FlagCategoryId {
  SIDEWAYS = 'SIDEWAYS',
  DOWNTREND = 'DOWNTREND',
  CRYPTO = 'CRYPTO',
  UPTREND = 'UPTREND',
  DEFAULT_UNTRACKED = 'DEFAULT_UNTRACKED',
  INDEX = 'INDEX',
  GOLD_INDEX = 'GOLD_INDEX',
}

/**
 * A first-class flag category definition.
 *
 * Each instance knows its:
 * - `id`            — semantic identifier
 * - `color`         — CSS color name used for flag painting
 * - `label`         — human-readable description
 * - `update`        — backend field update when a ticker is assigned to this category
 */
export interface FlagCategory {
  /** Semantic identifier (e.g. "GOLD_INDEX", "UPTREND"). */
  id: FlagCategoryId;

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
 * All flag categories in UI paint order.
 * This is the canonical list used by the FlagManager for paint, record, and lookup.
 */
export const ALL_FLAG_CATEGORIES: readonly FlagCategory[] = [
  {
    id: FlagCategoryId.SIDEWAYS,
    color: 'orange',
    label: 'Sideways / Consolidation',
    update: { trend: 'SIDEWAYS' },
  },
  {
    id: FlagCategoryId.DOWNTREND,
    color: 'red',
    label: 'Downtrend / Shorts',
    update: { trend: 'DOWNTREND' },
  },
  {
    id: FlagCategoryId.CRYPTO,
    color: 'dodgerblue',
    label: 'Crypto',
    update: { type: 'CRYPTO' },
  },
  {
    id: FlagCategoryId.UPTREND,
    color: 'lime',
    label: 'Uptrend / Longs',
    update: { trend: 'UPTREND' },
  },
  {
    id: FlagCategoryId.DEFAULT_UNTRACKED,
    color: 'white',
    label: 'Default / Untracked',
    update: {},
  },
  {
    id: FlagCategoryId.INDEX,
    color: 'brown',
    label: 'Index / Markets',
    update: { type: 'INDEX' },
  },
  {
    id: FlagCategoryId.GOLD_INDEX,
    color: 'darkkhaki',
    label: 'Gold / Composite Index',
    update: { type: 'COMPOSITE' },
  },
] as const;
