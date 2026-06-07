import { LRUCache } from 'lru-cache';
import { ITickerManager } from './ticker';
import { IJournalManager } from './journal';
import { Notifier } from '../util/notify';
import { isCompositeSymbol, TickerUpdateRequest } from '../models/ticker';
import { WatchCategory, WatchCategoryId, CategoryBuckets } from '../models/watch';
import { findWatchCategoryById, resolveWatchCategory } from './watch_category';

/**
 * Interface for managing watch category operations.
 *
 * All classification is backend-on-demand — no local snapshot.
 * The method works with one ticker at a time. Batch classification
 * is handled by callers when needed.
 */
export interface IWatchManager {
  /**
   * Get the watch category for a single ticker.
   * Resolves from backend data only (journals + ticker record).
   * Returns undefined if no category matches — callers should
   * apply UI-level fallback (e.g., default-white paint).
   * @param tvTicker Ticker symbol to look up
   */
  getTickerCategory(tvTicker: string): Promise<WatchCategory | undefined>;

  /**
   * Classify multiple tickers and group them into category buckets.
   * Composes {@link getTickerCategory} — no new business logic.
   * Uncategorized tickers are returned separately for UI fallback.
   * @param tvTickers Ticker symbols to classify
   */
  classifyTickers(tvTickers: string[]): Promise<CategoryBuckets>;

  /**
   * Records selected tickers in the given watch category.
   * Fires async backend updates for supported categories.
   * @param categoryId Category identifier to record into
   * @param tvTickers List of ticker symbols to assign
   */
  recordCategory(categoryId: WatchCategoryId, tvTickers: string[]): void;
}

/**
 * Manages watch category operations using an LRU-cached classification pipeline.
 *
 * Results are cached per ticker for 5 minutes to avoid redundant backend calls.
 * The cache is evicted for affected tickers during {@link recordCategory}.
 * Journal manager is injected as a lazy getter to avoid circular dependency
 * at factory construction time.
 */
export class WatchManager implements IWatchManager {
  /** Sentinel stored in cache for tickers that match no category. */
  private static readonly NO_CATEGORY = Symbol('no_category');

  /** LRU cache for ticker → category lookups. Uncategorized results are cached via sentinel. */
  private readonly categoryCache = new LRUCache<string, WatchCategory | typeof WatchManager.NO_CATEGORY>({
    max: 1000,
    ttl: 5 * 60 * 1000,
    fetchMethod: async (key: string): Promise<WatchCategory | typeof WatchManager.NO_CATEGORY> => {
      return this.loadTickerCategory(key);
    },
  });

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly getJournalManager: () => IJournalManager
  ) {}

  /** @inheritdoc */
  async getTickerCategory(tvTicker: string): Promise<WatchCategory | undefined> {
    const result = await this.categoryCache.fetch(tvTicker);
    return result === WatchManager.NO_CATEGORY ? undefined : result;
  }

  /**
   * Load a ticker's watch category from backend data (journals + ticker record).
   * Used as the fetchMethod callback by the LRU cache.
   * Returns the NO_CATEGORY sentinel for uncategorized tickers so the result is cached.
   */
  private async loadTickerCategory(tvTicker: string): Promise<WatchCategory | typeof WatchManager.NO_CATEGORY> {
    // 1. Check journals (highest priority)
    const journalCategory = await this.resolveJournalCategory(tvTicker);
    if (journalCategory !== undefined) {
      return journalCategory;
    }

    // 2. Check ticker-derived category
    const tickerCategory = await this.resolveTickerDerivedCategory(tvTicker);
    if (tickerCategory !== undefined) {
      return tickerCategory;
    }

    // 3. No match — cache sentinel so repeated lookups don't hit backend
    return WatchManager.NO_CATEGORY;
  }

  /** @inheritdoc */
  async classifyTickers(tvTickers: string[]): Promise<CategoryBuckets> {
    const entries = await Promise.all(tvTickers.map(async (t) => [t, await this.getTickerCategory(t)] as const));

    const buckets = new Map<WatchCategoryId, Set<string>>();
    const uncategorized = new Set<string>();

    for (const [ticker, category] of entries) {
      if (category) {
        const set = buckets.get(category.id) ?? new Set();
        set.add(ticker);
        buckets.set(category.id, set);
      } else {
        uncategorized.add(ticker);
      }
    }

    return { buckets, uncategorized };
  }

  /** @inheritdoc */
  recordCategory(categoryId: WatchCategoryId, tvTickers: string[]): void {
    const cat = findWatchCategoryById(categoryId);

    if (cat.recordUpdate === null) {
      Notifier.warn(`Category ${categoryId} does not support manual recording`);
      return;
    }

    for (const ticker of tvTickers) {
      this.evictTickerCategory(ticker);
      void this.updateBackend(ticker, cat.recordUpdate);
    }
  }

  // ── Cache Management ──

  /**
   * Evict a ticker from the category cache so the next lookup is fresh.
   */
  private evictTickerCategory(tvTicker: string): void {
    this.categoryCache.delete(tvTicker);
  }

  // ── Classification step helpers ──

  /**
   * Check if a ticker has a RUNNING journal.
   */
  private async resolveJournalCategory(tvTicker: string): Promise<WatchCategory | undefined> {
    // Composite symbols (e.g. 'BANKNIFTY/NIFTY') are not valid journal tickers
    if (isCompositeSymbol(tvTicker)) {
      return undefined;
    }

    const journalManager = this.getJournalManager();

    const runningJournals = await journalManager.listJournals({ ticker: tvTicker, status: 'RUNNING' });

    if (runningJournals.length > 0) {
      return findWatchCategoryById(WatchCategoryId.RUNNING);
    }

    return undefined;
  }

  /**
   * Fetch the backend ticker record and derive its watch category.
   */
  private async resolveTickerDerivedCategory(tvTicker: string): Promise<WatchCategory | undefined> {
    try {
      const ticker = await this.tickerManager.getTicker(tvTicker);
      const id = resolveWatchCategory(ticker);
      return id !== undefined ? findWatchCategoryById(id) : undefined;
    } catch {
      // Ticker not tracked on backend — no derived category
      return undefined;
    }
  }

  // ── Backend Update ──

  /**
   * Persist a category assignment to the backend.
   */
  private async updateBackend(ticker: string, update: TickerUpdateRequest): Promise<void> {
    try {
      await this.tickerManager.updateTicker(ticker, update);
    } catch {
      Notifier.warn(`Failed to update watch category for ${ticker}`);
    }
  }
}
