import { LRUCache } from 'lru-cache';
import { TickerUpdateRequest } from '../models/ticker';
import { Constants } from '../models/constant';
import { ITickerManager } from './ticker';
import { IPaintManager } from './paint';
import { IDomManager } from './dom';
import { Notifier } from '../util/notify';
import { FlagCategory, FlagCategoryId } from '../models/flag';
import { findFlagCategoryById, resolveFlagCategory } from './flag_category';

/**
 * Interface for managing flag-based ticker categories.
 * paint() reads tickers from the DOM and classifies via LRU cache.
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

  /**
   * Paints flag indicators for all rendered DOM tickers (watchlist + screener).
   * Classifies each ticker via LRU cache and paints flag colors through PaintManager.
   */
  paint(): void;
}

// ── Implementation ──

/**
 * Manages flag-based sets of tickers using LRU-cached classification.
 * Paint reads tickers from the DOM instead of fetching all backend records.
 *
 * Per-ticker lookups are cached via LRU (max 1000, ttl 5 min).
 * Unclassified results (undefined) are treated as cache misses —
 * only known categories are stored.
 *
 * Classification logic (which category a ticker belongs to) is delegated to
 * the flag_category resolver module.
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

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly paintManager: IPaintManager,
    private readonly domManager: IDomManager
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
      // Optimistic: show new category immediately
      this.categoryCache.set(ticker, cat);
      void this.updateBackend(ticker, cat.update);
    }
  }

  /** @inheritdoc */
  paint(): void {
    void (async () => {
      const tickers = [...new Set(this.domManager.getRenderedTickers())];
      await Promise.all(
        tickers.map(async (ticker) => {
          const category = await this.getTickerCategory(ticker);
          await this.paintManager.paintFlagV1(ticker, category?.color);
        })
      );
    })();
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
