import { TickerUpdateRequest, TickerType, TickerState, TickerTrend } from './ticker';

/**
 * Category identifier enum for flag classification.
 * Each category maps to a display color and a backend field update.
 */
export enum FlagCategoryId {
  SIDEWAYS = 'SIDEWAYS',
  DOWNTREND = 'DOWNTREND',
  CRYPTO = 'CRYPTO',
  UPTREND = 'UPTREND',
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
   */
  update: TickerUpdateRequest;
}

// ── Category Definitions ──

/**
 * All flag categories in UI paint order.
 * This is the canonical list used by the FlagManager for paint, record, and lookup.
 * Categories that are NOT recordable (e.g. unclassified) are omitted — they
 * simply are not painted.
 */
export const ALL_FLAG_CATEGORIES: readonly FlagCategory[] = [
  {
    id: FlagCategoryId.SIDEWAYS,
    color: 'orange',
    label: 'Sideways / Consolidation',
    update: { trend: TickerTrend.SIDEWAYS, type: TickerType.EQUITY, state: TickerState.WATCHED },
  },
  {
    id: FlagCategoryId.DOWNTREND,
    color: 'red',
    label: 'Downtrend / Shorts',
    update: { trend: TickerTrend.DOWNTREND, type: TickerType.EQUITY, state: TickerState.WATCHED },
  },
  {
    id: FlagCategoryId.CRYPTO,
    color: 'dodgerblue',
    label: 'Crypto',
    update: { type: TickerType.CRYPTO, state: TickerState.WATCHED },
  },
  {
    id: FlagCategoryId.UPTREND,
    color: 'lime',
    label: 'Uptrend / Longs',
    update: { trend: TickerTrend.UPTREND, type: TickerType.EQUITY, state: TickerState.WATCHED },
  },
  {
    id: FlagCategoryId.INDEX,
    color: 'brown',
    label: 'Index / Markets',
    update: { type: TickerType.INDEX, state: TickerState.WATCHED },
  },
  {
    id: FlagCategoryId.GOLD_INDEX,
    color: 'darkkhaki',
    label: 'Gold / Composite Index',
    update: { type: TickerType.COMPOSITE, state: TickerState.WATCHED },
  },
] as const;
