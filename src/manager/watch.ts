import { LRUCache } from 'lru-cache';
import { Constants } from '../models/constant';
import { ITickerManager } from './ticker';
import { IJournalManager } from './journal';
import { Notifier } from '../util/notify';
import { isCompositeSymbol, Ticker, TickerUpdateRequest } from '../models/ticker';
import { ALL_WATCH_CATEGORIES, WatchCategory, WatchCategoryId } from '../models/watch';

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
  /** LRU cache for ticker → category lookups. Misses are not cached. */
  private readonly categoryCache = new LRUCache<string, WatchCategory>({
    max: Constants.CACHE.CATEGORY.MAX,
    ttl: Constants.CACHE.CATEGORY.TTL_MS,
    fetchMethod: async (key: string): Promise<WatchCategory | undefined> => {
      return this.loadTickerCategory(key);
    },
  });

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly getJournalManager: () => IJournalManager
  ) {}

  /** @inheritdoc */
  async getTickerCategory(tvTicker: string): Promise<WatchCategory | undefined> {
    return this.categoryCache.fetch(tvTicker);
  }

  /**
   * Load a ticker's watch category from backend data (journals + ticker record).
   * Used as the fetchMethod callback by the LRU cache.
   * Returns undefined for uncategorized tickers; the cache does NOT store misses.
   */
  private async loadTickerCategory(tvTicker: string): Promise<WatchCategory | undefined> {
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

    // 3. No match — let caller apply UI fallback
    return undefined;
  }

  /** @inheritdoc */
  recordCategory(categoryId: WatchCategoryId, tvTickers: string[]): void {
    const cat = findWatchCategoryById(categoryId);

    if (cat.recordUpdate === null) {
      Notifier.warn(`Category ${categoryId} does not support manual recording`);
      return;
    }

    for (const ticker of tvTickers) {
      // Optimistic: show new category colour immediately
      this.categoryCache.set(ticker, cat);
      void this.syncBackend(ticker, cat.recordUpdate);
    }
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
   * Sync a category assignment to the backend.
   * Reverts optimistic cache entry on failure.
   */
  private async syncBackend(ticker: string, update: TickerUpdateRequest): Promise<void> {
    try {
      await this.tickerManager.updateTicker(ticker, update);
    } catch {
      // Revert optimistic cache entry
      this.categoryCache.delete(ticker);
      Notifier.warn(`Failed to update watch category for ${ticker}`);
    }
  }
}

// ════════════════════════════════════════════
// Category Helpers (no DI — pure functions)
// ════════════════════════════════════════════

/**
 * Look up a watch category by its semantic ID.
 * @throws If no category exists for the given ID
 */
export function findWatchCategoryById(id: WatchCategoryId): WatchCategory {
  const cat = ALL_WATCH_CATEGORIES.find((c) => c.id === id);
  if (!cat) {
    throw new Error(`Invalid watch category id: ${id}`);
  }
  return cat;
}

/**
 * Check whether a ticker's timeframes make it a long-watch candidate
 * (does not contain DL).
 */
function isLongWatch(ticker: Ticker): boolean {
  return !ticker.timeframes.includes('DL');
}

/**
 * Check whether a ticker is India-listed based on exchange.
 */
function isIndiaExchange(ticker: Ticker): boolean {
  return ticker.exchange === 'NSE';
}

/**
 * Resolve a single ticker to its watch category ID based on backend fields only.
 * Does NOT resolve DEFAULT_DAILY — callers must apply that fallback when the
 * ticker is present in the TV watchlist.
 *
 * Returns undefined if the ticker does not match any backend-derived category.
 */
export function resolveWatchCategory(ticker: Ticker): WatchCategoryId | undefined {
  let result: WatchCategoryId | undefined;

  // READY
  if (ticker.state === 'READY') {
    result = WatchCategoryId.READY;
  } else if (ticker.type === 'COMPOSITE') {
    // Composite instruments (type takes priority over timeframe-based classification)
    result = WatchCategoryId.COMPOSITE;
  } else if (Constants.FLAGS.INDEX_TICKER_TYPES.includes(ticker.type)) {
    // Market instruments (INDEX, COMMODITY, FX, BOND)
    result = WatchCategoryId.INDEX;
  } else if (isLongWatch(ticker)) {
    // Long-watch (timeframes no DL), split by exchange
    result = isIndiaExchange(ticker) ? WatchCategoryId.LONG_NSE : WatchCategoryId.LONG_NON_NSE;
  }
  // else: result remains undefined (DEFAULT_DAILY fallback)

  return result;
}
