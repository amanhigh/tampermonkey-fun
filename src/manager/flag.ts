import { LRUCache } from 'lru-cache';
import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { ITickerManager } from './ticker';
import { IPaintManager } from './paint';
import { Notifier } from '../util/notify';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';
import { findFlagCategoryById, resolveFlagCategory } from './flag_category';

/**
 * Interface for managing flag-based ticker categories.
 * paint() fetches fresh backend data every call. getTickerCategory()
 * resolves from backend with an LRU cache.
 */
export interface IFlagManager {
  /**
   * Gets the flag category for a ticker.
   * Resolves from backend data with a 5-min LRU cache. Returns undefined
   * for DEFAULT_UNTRACKED or untracked tickers.
   * @param ticker Ticker symbol to look up
   */
  getTickerCategory(ticker: string): Promise<FlagCategory | undefined>;

  /**
   * Records selected tickers in the given flag category.
   * Fires an async backend `updateTicker()` per ticker using the category's
   * defined update payload. Evicts the ticker from cache before the update.
   * @param categoryId Category identifier (e.g. 'SIDEWAYS', 'CRYPTO')
   * @param tvTickers List of ticker symbols to assign
   */
  recordCategory(categoryId: FlagCategoryId, tvTickers: string[]): void;

  /**
   * Paints flag indicators based on backend ticker data.
   * Fetches fresh `listTickers({})` every call and groups by category.
   * @param selector CSS selector for ticker elements
   * @param itemSelector CSS selector for item container
   */
  paint(selector: string, itemSelector: string): void;
}

// ── Implementation ──

/**
 * Manages flag-based sets of tickers using backend calls per paint.
 *
 * Per-ticker lookups are cached via LRU (max 1000, ttl 5 min).
 * DEFAULT_UNTRACKED results are treated as cache misses — only known
 * categories are stored.
 *
 * Classification logic (which category a ticker belongs to) is delegated to
 * the flag_category resolver module.
 */
export class FlagManager implements IFlagManager {
  /** LRU cache for ticker → flag category lookups. Misses are not cached. */
  private readonly categoryCache = new LRUCache<string, FlagCategory>({
    max: 1000,
    ttl: 5 * 60 * 1000,
    fetchMethod: async (key: string): Promise<FlagCategory | undefined> => {
      return this.loadFlagCategory(key);
    },
  });

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly paintManager: IPaintManager
  ) {}

  // ── Public API ──

  /** @inheritdoc */
  async getTickerCategory(ticker: string): Promise<FlagCategory | undefined> {
    return this.categoryCache.fetch(ticker);
  }

  /** @inheritdoc */
  recordCategory(categoryId: FlagCategoryId, tvTickers: string[]): void {
    const cat = findFlagCategoryById(categoryId);

    for (const ticker of tvTickers) {
      this.evictFlagCategory(ticker);
      void this.updateBackend(ticker, cat.update);
    }
  }

  /** @inheritdoc */
  paint(selector: string, itemSelector: string): void {
    void this.paintFromBackend(selector, itemSelector);
  }

  // ── Cache Management ──

  /**
   * Evict a ticker from the flag category cache so the next lookup is fresh.
   */
  private evictFlagCategory(ticker: string): void {
    this.categoryCache.delete(ticker);
  }

  /**
   * Load a ticker's flag category from backend data.
   * Used as the fetchMethod callback by the LRU cache.
   * Returns undefined for DEFAULT_UNTRACKED or untracked tickers;
   * the cache does NOT store misses.
   */
  private async loadFlagCategory(ticker: string): Promise<FlagCategory | undefined> {
    try {
      const record = await this.tickerManager.getTicker(ticker);
      const cat = resolveFlagCategory(record);
      if (cat.id === FlagCategoryId.DEFAULT_UNTRACKED) {
        return undefined;
      }
      return cat;
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
      Notifier.warn(`Failed to update flag category for ${ticker}`);
    }
  }

  /**
   * Fetch all tickers from the backend, group them into category sets,
   * and paint each category.
   */
  private async paintFromBackend(selector: string, itemSelector: string): Promise<void> {
    try {
      const tickers = await this.tickerManager.listTickers({});
      const groups = this.groupTickersByCategory(tickers);
      this.paintGroups(selector, itemSelector, groups);
    } catch {
      // Backend call failed — nothing to paint
    }
  }

  // ── Grouping and painting helpers ──

  /**
   * Create a new map with empty sets for every flag category.
   */
  private createEmptyCategoryGroups(): Map<FlagCategoryId, Set<string>> {
    const groups = new Map<FlagCategoryId, Set<string>>();
    for (const cat of ALL_FLAG_CATEGORIES) {
      groups.set(cat.id, new Set());
    }
    return groups;
  }

  /**
   * Group a list of ticker records into flag category sets.
   */
  private groupTickersByCategory(tickers: Ticker[]): Map<FlagCategoryId, Set<string>> {
    const groups = this.createEmptyCategoryGroups();

    // Classify each ticker into the first matching category
    for (const ticker of tickers) {
      const cat = resolveFlagCategory(ticker);
      groups.get(cat.id)?.add(ticker.ticker);
    }

    return groups;
  }

  /**
   * Paint flags for every category using the given group sets.
   */
  private paintGroups(selector: string, itemSelector: string, groups: Map<FlagCategoryId, Set<string>>): void {
    for (const cat of ALL_FLAG_CATEGORIES) {
      const symbols = groups.get(cat.id) ?? new Set();
      this.paintManager.paintFlags(selector, symbols, cat.color, itemSelector);
    }
  }
}
