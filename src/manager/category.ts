import { LRUCache } from 'lru-cache';
import { Constants } from '../models/constant';
import { ITickerManager } from './ticker';
import { IJournalManager } from './journal';
import { Notifier } from '../util/notify';
import { isCompositeSymbol, TickerState, TickerUpdateRequest } from '../models/ticker';
import { WatchCategory, WatchCategoryId } from '../models/watch';
import { FlagCategory, FlagCategoryId } from '../models/flag';
import { TickerCategory } from '../models/category';
import { WatchClassifier, FlagClassifier } from './classification';
import { IPublisher } from './event_bus';
import { DomainEventType } from '../models/domain_event';

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
   * Resolves when all backend updates complete.
   * @param categoryId Watch category identifier to record into
   * @param tickers List of ticker symbols to assign
   */
  recordWatchCategory(categoryId: WatchCategoryId, tickers: string[]): Promise<void>;

  /**
   * Records selected tickers in the given flag category.
   * Fires an async backend update per ticker.
   * Resolves when all backend updates complete.
   * @param categoryId Flag category identifier to record into
   * @param tickers List of ticker symbols to assign
   */
  recordFlagCategory(categoryId: FlagCategoryId, tickers: string[]): Promise<void>;

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
  /**
   * Toggle READY state for a single ticker.
   * - If the ticker is currently READY, clear it to WATCHED.
   * - If the ticker is NOT currently READY, mark it as READY.
   * Publishes TICKER_CATEGORY_CHANGED after update.
   * @param ticker Ticker symbol to toggle
   */
  toggleReadyState(ticker: string): Promise<void>;

  /**
   * Clear READY state for tickers that are currently READY.
   * Non-READY tickers are silently skipped.
   * Publishes TICKER_CATEGORY_CHANGED only for tickers that were
   * actually cleared.
   * @param tickers Ticker symbols to clear READY for
   */
  clearReadyState(tickers: string[]): Promise<void>;
}

// ── Implementation ──

/**
 * Manages watch + flag category resolution using a unified LRU cache.
 *
 * Journal status (RUNNING) is checked first for watch classification.
 * All other categories (watch and flag) are derived from the backend
 * ticker record.
 *
 * Record operations evict the cache entry before and after the backend
 * update so the next paint always reflects fresh backend data. No
 * optimistic partial cache is written — immediate paint fetches from
 * backend and derives both watch + flag correctly.
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
    private readonly getJournalManager: () => IJournalManager,
    private readonly publisher: IPublisher
  ) {}

  // ── Public API ──

  /** @inheritdoc */
  async getTickerCategory(ticker: string): Promise<TickerCategory> {
    return (await this.categoryCache.fetch(ticker)) ?? { watch: undefined, flag: undefined, isFno: false };
  }

  /** @inheritdoc */
  async recordWatchCategory(categoryId: WatchCategoryId, tickers: string[]): Promise<void> {
    const cat = WatchClassifier.findById(categoryId);
    const update = cat.recordUpdate;

    if (update === null) {
      Notifier.warn(`Category ${categoryId} does not support manual recording`);
      return;
    }

    await Promise.all(tickers.map(async (ticker) => this.syncBackend(ticker, update)));

    // Publish event so alert-feed consumers repaint affected tickers
    if (tickers.length > 0) {
      await this.publisher.publish({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers,
      });
    }
  }

  /** @inheritdoc */
  async recordFlagCategory(categoryId: FlagCategoryId, tickers: string[]): Promise<void> {
    const cat = FlagClassifier.findById(categoryId);

    await Promise.all(tickers.map(async (ticker) => this.syncBackend(ticker, cat.update)));

    // Publish event so alert-feed consumers repaint affected tickers
    if (tickers.length > 0) {
      await this.publisher.publish({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers,
      });
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

  /** @inheritdoc */
  async toggleReadyState(ticker: string): Promise<void> {
    const cat = await this.getTickerCategory(ticker);
    if (cat.watch?.id === WatchCategoryId.READY) {
      await this.syncBackend(ticker, { state: TickerState.WATCHED });
      Notifier.success(`⏹ Cleared ready ${ticker}`);
    } else {
      await this.syncBackend(ticker, { state: TickerState.READY });
      Notifier.red(`⏺ Marked ready ${ticker}`);
    }

    await this.publisher.publish({
      type: DomainEventType.TICKER_CATEGORY_CHANGED,
      tickers: [ticker],
    });
  }

  /** @inheritdoc */
  async clearReadyState(tickers: string[]): Promise<void> {
    if (tickers.length === 0) {
      return;
    }

    const cleared: string[] = [];
    for (const ticker of tickers) {
      const cat = await this.getTickerCategory(ticker);
      if (cat.watch?.id === WatchCategoryId.READY) {
        await this.syncBackend(ticker, { state: TickerState.WATCHED });
        Notifier.success(`⏹ Cleared ready ${ticker}`);
        cleared.push(ticker);
      }
    }

    if (cleared.length > 0) {
      await this.publisher.publish({
        type: DomainEventType.TICKER_CATEGORY_CHANGED,
        tickers: cleared,
      });
    }
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
   * Evicts the cache before and after update so the next paint
   * re-fetches fresh backend data and derives both watch + flag
   * from the current backend state. No optimistic partial cache
   * is written — this avoids stale side category bugs.
   *
   * On failure the cache is evicted and a warning is shown.
   */
  private async syncBackend(ticker: string, update: TickerUpdateRequest): Promise<void> {
    // Evict before update to avoid stale cache during the update window
    this.evictTicker(ticker);

    try {
      await this.tickerManager.updateTicker(ticker, update);
      // Evict after success so next lookup refetches authoritative backend data
      this.evictTicker(ticker);
    } catch {
      this.evictTicker(ticker);
      Notifier.warn(`Failed to update category for ${ticker}`);
    }
  }
}
