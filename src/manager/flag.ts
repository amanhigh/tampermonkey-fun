import { LRUCache } from 'lru-cache';
import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { Constants } from '../models/constant';
import { ITickerManager } from './ticker';
import { Notifier } from '../util/notify';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';

/**
 * Interface for managing flag-based ticker categories.
 * getTickerCategory() resolves from backend with an LRU cache.
 */
export interface IFlagManager {
  /**
   * Gets the flag category for a ticker.
   * Resolves from backend data with a 5-min LRU cache. Returns undefined
   * for unclassified or untracked tickers.
   * @param ticker Ticker symbol to look up
   */
  getTickerCategory(ticker: string): Promise<FlagCategory | undefined>;

  /**
   * Records selected tickers in the given flag category.
   * Fires an async backend `updateTicker()` per ticker using the category's
   * defined update payload. Sets the cache optimistically before the update;
   * reverts on failure.
   * @param categoryId Category identifier (e.g. 'SIDEWAYS', 'CRYPTO')
   * @param tvTickers List of ticker symbols to assign
   */
  recordCategory(categoryId: FlagCategoryId, tvTickers: string[]): void;
}

// ── Implementation ──

/**
 * Manages flag-based sets of tickers using LRU-cached classification.
 *
 * Per-ticker lookups are cached via LRU (max 1000, ttl 5 min).
 * Unclassified results (undefined) are treated as cache misses —
 * only known categories are stored.
 *
 * Classification logic (which category a ticker belongs to) is delegated to
 * the flag category helpers.
 */
export class FlagManager implements IFlagManager {
  /** LRU cache for ticker → flag category lookups. Misses are not cached. */
  private readonly categoryCache = new LRUCache<string, FlagCategory>({
    max: Constants.CACHE.CATEGORY.MAX,
    ttl: Constants.CACHE.CATEGORY.TTL_MS,
    fetchMethod: async (key: string): Promise<FlagCategory | undefined> => {
      return this.loadFlagCategory(key);
    },
  });

  constructor(private readonly tickerManager: ITickerManager) {}

  // ── Public API ──

  /** @inheritdoc */
  async getTickerCategory(ticker: string): Promise<FlagCategory | undefined> {
    return this.categoryCache.fetch(ticker);
  }

  /** @inheritdoc */
  recordCategory(categoryId: FlagCategoryId, tvTickers: string[]): void {
    const cat = findFlagCategoryById(categoryId);

    for (const ticker of tvTickers) {
      // Optimistic: show new category immediately
      this.categoryCache.set(ticker, cat);
      void this.updateBackend(ticker, cat.update);
    }
  }

  /**
   * Load a ticker's flag category from backend data.
   * Used as the fetchMethod callback by the LRU cache.
   * Returns undefined for unclassified or untracked tickers;
   * the cache does NOT store misses.
   */
  private async loadFlagCategory(ticker: string): Promise<FlagCategory | undefined> {
    try {
      const record = await this.tickerManager.getTicker(ticker);
      return resolveFlagCategory(record);
    } catch {
      // Ticker not tracked on backend
      return undefined;
    }
  }

  // ── Backend sync ──

  /**
   * Persist a category assignment to the backend.
   */
  private async updateBackend(ticker: string, update: TickerUpdateRequest): Promise<void> {
    try {
      await this.tickerManager.updateTicker(ticker, update);
    } catch {
      // Update failed — revert optimistic cache entry
      this.categoryCache.delete(ticker);
      Notifier.warn(`Failed to update flag category for ${ticker}`);
    }
  }
}

// ════════════════════════════════════════════
// Category Helpers (no DI — pure functions)
// ════════════════════════════════════════════

/**
 * Priority-ordered list of category IDs used by resolveFlagCategory().
 * Order: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND
 */
const FLAG_CATEGORY_PRIORITY: readonly FlagCategoryId[] = [
  FlagCategoryId.GOLD_INDEX,
  FlagCategoryId.INDEX,
  FlagCategoryId.CRYPTO,
  FlagCategoryId.UPTREND,
  FlagCategoryId.SIDEWAYS,
  FlagCategoryId.DOWNTREND,
] as const;

/**
 * Look up a flag category by its semantic ID.
 * @throws If no category exists for the given ID
 */
export function findFlagCategoryById(id: FlagCategoryId): FlagCategory {
  const cat = ALL_FLAG_CATEGORIES.find((c) => c.id === id);
  if (!cat) {
    throw new Error(`Invalid category id: ${id}`);
  }
  return cat;
}

/**
 * Check whether a ticker symbol is gold-index related.
 * A gold-index symbol is a composite expression containing XAUUSD or GOLDSILVER.
 */
function isGoldIndexSymbol(ticker: string): boolean {
  const upper = ticker.toUpperCase();
  return Constants.FLAGS.GOLD_INDEX_TOKENS.some((token) => upper.includes(token));
}

/**
 * Check whether a ticker type is a market instrument (INDEX, COMPOSITE, COMMODITY, FX, BOND).
 */
function isMarket(ticker: Ticker): boolean {
  return Constants.FLAGS.INDEX_TICKER_TYPES.includes(ticker.type) || ticker.type === 'COMPOSITE';
}

/**
 * Check whether a ticker matches a given category's criteria.
 */
function matchesCategory(categoryId: FlagCategoryId, ticker: Ticker): boolean {
  switch (categoryId) {
    case FlagCategoryId.GOLD_INDEX:
      return isMarket(ticker) && isGoldIndexSymbol(ticker.ticker);
    case FlagCategoryId.INDEX:
      return isMarket(ticker);
    case FlagCategoryId.CRYPTO:
      return ticker.type === 'CRYPTO';
    case FlagCategoryId.UPTREND:
      return ticker.trend === 'UPTREND';
    case FlagCategoryId.SIDEWAYS:
      return ticker.trend === 'SIDEWAYS';
    case FlagCategoryId.DOWNTREND:
      return ticker.trend === 'DOWNTREND';
    default:
      return false;
  }
}

/**
 * Find the highest-priority flag category for a ticker.
 * Returns undefined if no category matches (unclassified ticker).
 */
export function resolveFlagCategory(ticker: Ticker): FlagCategory | undefined {
  for (const id of FLAG_CATEGORY_PRIORITY) {
    if (matchesCategory(id, ticker)) {
      return findFlagCategoryById(id);
    }
  }
  return undefined;
}
