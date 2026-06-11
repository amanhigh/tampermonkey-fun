import { LRUCache } from 'lru-cache';
import { Constants } from '../models/constant';
import { ITickerManager } from './ticker';
import { IJournalManager } from './journal';
import { Notifier } from '../util/notify';
import { isCompositeSymbol, TickerUpdateRequest } from '../models/ticker';
import { WatchCategory, WatchCategoryId } from '../models/watch';
import { FlagCategory, FlagCategoryId } from '../models/flag';
import { TickerCategory } from '../models/category';
import { WatchClassifier, FlagClassifier } from './classification';

// Re-export classification helpers for test and external use
export { WatchClassifier, FlagClassifier };

/**
 * Interface for unified category management.
 *
 * Resolves both watch and flag categories from a single backend lookup,
 * returning a combined TickerCategory result.
 */
export interface ICategoryManager {
  /**
   * Get the combined watch + flag categories for a single ticker.
   * Resolves from backend data with an LRU cache.
   * @param ticker Ticker symbol to look up
   */
  getTickerCategory(ticker: string): Promise<TickerCategory>;

  /**
   * Records selected tickers in the given watch category.
   * Fires async backend updates for supported categories.
   * @param categoryId Watch category identifier to record into
   * @param tickers List of ticker symbols to assign
   */
  recordWatchCategory(categoryId: WatchCategoryId, tickers: string[]): void;

  /**
   * Records selected tickers in the given flag category.
   * Fires an async backend update per ticker.
   * @param categoryId Flag category identifier to record into
   * @param tickers List of ticker symbols to assign
   */
  recordFlagCategory(categoryId: FlagCategoryId, tickers: string[]): void;

  /**
   * Resolve categories for many tickers in parallel batches.
   * Returns a map so callers can iterate without further I/O.
   * @param tickers Ticker symbols to look up
   * @param concurrency Max concurrent fetches per batch (default 10)
   */
  getBatchCategory(tickers: string[], concurrency?: number): Promise<Map<string, TickerCategory>>;

  /**
   * Evict a single ticker from the category cache.
   * Next lookup will re-fetch from backend.
   * @param ticker Ticker symbol to evict
   */
  evictTicker(ticker: string): void;
}

// ── Implementation ──

/**
 * Manages watch + flag category resolution using a unified LRU cache.
 *
 * Journal status (RUNNING) is checked first for watch classification.
 * All other categories (watch and flag) are derived from the backend
 * ticker record.
 *
 * Record operations delete the cache entry then set only the recorded
 * side (watch or flag) so the immediate paint shows the new category.
 * On completion the cache is evicted so the next lookup re-fetches
 * both sides from current backend data.
 */
export class CategoryManager implements ICategoryManager {
  /** LRU cache for ticker → combined category lookups. */
  private readonly categoryCache = new LRUCache<string, TickerCategory>({
    max: Constants.CACHE.CATEGORY.MAX,
    ttl: Constants.CACHE.CATEGORY.TTL_MS,
    fetchMethod: async (key: string): Promise<TickerCategory | undefined> => {
      return this.loadTickerCategory(key);
    },
  });

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly getJournalManager: () => IJournalManager
  ) {}

  // ── Public API ──

  /** @inheritdoc */
  async getTickerCategory(ticker: string): Promise<TickerCategory> {
    return (await this.categoryCache.fetch(ticker)) ?? { watch: undefined, flag: undefined, isFno: false };
  }

  /** @inheritdoc */
  recordWatchCategory(categoryId: WatchCategoryId, tickers: string[]): void {
    const cat = WatchClassifier.findById(categoryId);

    if (cat.recordUpdate === null) {
      Notifier.warn(`Category ${categoryId} does not support manual recording`);
      return;
    }

    for (const ticker of tickers) {
      void this.syncBackend(
        ticker,
        cat.recordUpdate,
        { watch: cat, flag: undefined, isFno: false },
        /* isWatch */ true
      );
    }
  }

  /** @inheritdoc */
  recordFlagCategory(categoryId: FlagCategoryId, tickers: string[]): void {
    const cat = FlagClassifier.findById(categoryId);

    for (const ticker of tickers) {
      void this.syncBackend(ticker, cat.update, { watch: undefined, flag: cat, isFno: false }, /* isWatch */ false);
    }
  }

  /** @inheritdoc */
  async getBatchCategory(tickers: string[], concurrency: number = 10): Promise<Map<string, TickerCategory>> {
    const results = new Map<string, TickerCategory>();
    for (let i = 0; i < tickers.length; i += concurrency) {
      const batch = tickers.slice(i, i + concurrency);
      const entries = await Promise.all(
        batch.map(async (ticker) => {
          const cat = await this.getTickerCategory(ticker);
          return [ticker, cat] as const;
        })
      );
      for (const [ticker, cat] of entries) {
        results.set(ticker, cat);
      }
    }
    return results;
  }

  /** @inheritdoc */
  evictTicker(ticker: string): void {
    this.categoryCache.delete(ticker);
  }

  // ── Cache fetch method ──

  /**
   * Load a ticker's combined categories from backend data.
   * Fires journal check and ticker fetch in parallel.
   * Returns undefined only when no category and not FNO (avoids caching a complete miss).
   */
  private async loadTickerCategory(ticker: string): Promise<TickerCategory | undefined> {
    // Fire journal check and ticker fetch in parallel
    const [journalCategory, tickerRecord] = await Promise.all([
      this.resolveJournalCategory(ticker),
      this.tickerManager.getTicker(ticker).catch(() => undefined),
    ]);

    let watch: WatchCategory | undefined;
    let flag: FlagCategory | undefined;
    let isFno = false;

    // Watch: journal-based (RUNNING) takes priority
    if (journalCategory !== undefined) {
      watch = journalCategory;
    } else if (tickerRecord !== undefined) {
      watch = WatchClassifier.findByTicker(tickerRecord);
    }

    // Flag: derived from ticker record only
    if (tickerRecord !== undefined) {
      flag = FlagClassifier.findByTicker(tickerRecord);
      isFno = tickerRecord.is_fno;
    }

    // Nothing to cache — avoid caching a complete miss
    if (watch === undefined && flag === undefined && !isFno) {
      return undefined;
    }

    return { watch, flag, isFno };
  }

  // ── Classification helpers ──

  /**
   * Check if a ticker has a RUNNING journal.
   * Composite symbols are skipped.
   */
  private async resolveJournalCategory(ticker: string): Promise<WatchCategory | undefined> {
    if (isCompositeSymbol(ticker)) {
      return undefined;
    }

    const journalManager = this.getJournalManager();
    const runningJournals = await journalManager.listJournals({ ticker, status: 'RUNNING' });

    if (runningJournals.length > 0) {
      return WatchClassifier.findById(WatchCategoryId.RUNNING);
    }

    return undefined;
  }

  // ── Backend sync ──

  /**
   * Persist a category assignment to the backend.
   *
   * Sets the cache optimistically (synchronous, before await) so the
   * immediate paint shows the new category. On failure the cache entry
   * is evicted so the next lookup falls back to pre-update backend data.
   * isFno is never touched — preserved from the existing cache entry.
   */
  private async syncBackend(
    ticker: string,
    update: TickerUpdateRequest,
    optimistic: TickerCategory,
    isWatch: boolean
  ): Promise<void> {
    // Preserve existing isFno (FNO is read-only, never modified from UI)
    const existing = this.categoryCache.get(ticker);
    this.categoryCache.set(ticker, { ...optimistic, isFno: existing?.isFno ?? false });

    try {
      await this.tickerManager.updateTicker(ticker, update);
      // Success: optimistic cache entry is correct — keep it
    } catch {
      // Failure: revert optimistic cache entry
      this.evictTicker(ticker);
      Notifier.warn(`Failed to update ${isWatch ? 'watch' : 'flag'} category for ${ticker}`);
    }
  }
}
