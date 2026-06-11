import { LRUCache } from 'lru-cache';
import { Constants } from '../models/constant';
import { ITickerManager } from './ticker';
import { IJournalManager } from './journal';
import { Notifier } from '../util/notify';
import { isCompositeSymbol, Ticker, TickerUpdateRequest } from '../models/ticker';
import { ALL_WATCH_CATEGORIES, WatchCategory, WatchCategoryId } from '../models/watch';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';
import { TickerCategory } from '../models/category';

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
}

// ── Implementation ──

/**
 * Manages watch + flag category resolution using a unified LRU cache
 * with optimistic overlay support for record operations.
 *
 * Journal status (RUNNING) is checked first for watch classification.
 * All other categories (watch and flag) are derived from the backend
 * ticker record.
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

  /**
   * Optimistic overrides applied on top of cached/resolved results.
   * Cleared on backend sync success or failure.
   */
  private readonly optimisticOverrides = new Map<string, Partial<TickerCategory>>();

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly getJournalManager: () => IJournalManager
  ) {}

  // ── Public API ──

  /** @inheritdoc */
  async getTickerCategory(ticker: string): Promise<TickerCategory> {
    const base = await this.categoryCache.fetch(ticker);
    const override = this.optimisticOverrides.get(ticker);
    if (override) {
      return {
        watch: override.watch !== undefined ? override.watch : base?.watch,
        flag: override.flag !== undefined ? override.flag : base?.flag,
      };
    }
    return base ?? { watch: undefined, flag: undefined };
  }

  /** @inheritdoc */
  recordWatchCategory(categoryId: WatchCategoryId, tickers: string[]): void {
    const cat = findWatchCategoryById(categoryId);

    if (cat.recordUpdate === null) {
      Notifier.warn(`Category ${categoryId} does not support manual recording`);
      return;
    }

    for (const ticker of tickers) {
      this.optimisticOverrides.set(ticker, { watch: cat });
      void this.syncBackend(ticker, cat.recordUpdate, /* isWatch */ true);
    }
  }

  /** @inheritdoc */
  recordFlagCategory(categoryId: FlagCategoryId, tickers: string[]): void {
    const cat = findFlagCategoryById(categoryId);

    for (const ticker of tickers) {
      this.optimisticOverrides.set(ticker, { flag: cat });
      void this.syncBackend(ticker, cat.update, /* isWatch */ false);
    }
  }

  // ── Cache fetch method ──

  /**
   * Load a ticker's combined categories from backend data.
   * Fires journal check and ticker fetch in parallel.
   * Returns undefined when neither watch nor flag category is found
   * (misses are not cached).
   */
  private async loadTickerCategory(ticker: string): Promise<TickerCategory | undefined> {
    // Fire journal check and ticker fetch in parallel
    const [journalCategory, tickerRecord] = await Promise.all([
      this.resolveJournalCategory(ticker),
      this.fetchTickerRecord(ticker),
    ]);

    let watch: WatchCategory | undefined;
    let flag: FlagCategory | undefined;

    // Watch: journal-based (RUNNING) takes priority
    if (journalCategory !== undefined) {
      watch = journalCategory;
    } else if (tickerRecord !== undefined) {
      const watchId = resolveWatchCategory(tickerRecord);
      if (watchId !== undefined) {
        watch = findWatchCategoryById(watchId);
      }
    }

    // Flag: derived from ticker record only
    if (tickerRecord !== undefined) {
      flag = resolveFlagCategory(tickerRecord);
    }

    // Neither found — avoid caching a complete miss
    if (watch === undefined && flag === undefined) {
      return undefined;
    }

    return { watch, flag };
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
      return findWatchCategoryById(WatchCategoryId.RUNNING);
    }

    return undefined;
  }

  /**
   * Fetch the backend ticker record. Returns undefined on failure
   * (untracked or backend error).
   */
  private async fetchTickerRecord(ticker: string): Promise<Ticker | undefined> {
    try {
      return await this.tickerManager.getTicker(ticker);
    } catch {
      return undefined;
    }
  }

  // ── Backend sync ──

  /**
   * Persist a category assignment to the backend.
   * Clears optimistic state on success. On failure, reverts
   * optimistic cache and warns the user.
   */
  private async syncBackend(ticker: string, update: TickerUpdateRequest, isWatch: boolean): Promise<void> {
    try {
      await this.tickerManager.updateTicker(ticker, update);
    } catch {
      Notifier.warn(`Failed to update ${isWatch ? 'watch' : 'flag'} category for ${ticker}`);
    } finally {
      // Clear optimistic state and force re-fetch on next lookup
      this.optimisticOverrides.delete(ticker);
      this.categoryCache.delete(ticker);
    }
  }
}

// ════════════════════════════════════════════
// Category Helpers (pure functions)
// ════════════════════════════════════════════

// ── Watch Category Helpers ──

/** Priority-ordered list of flag category IDs used by resolveFlagCategory(). */
const FLAG_CATEGORY_PRIORITY: readonly FlagCategoryId[] = [
  FlagCategoryId.GOLD_INDEX,
  FlagCategoryId.INDEX,
  FlagCategoryId.CRYPTO,
  FlagCategoryId.UPTREND,
  FlagCategoryId.SIDEWAYS,
  FlagCategoryId.DOWNTREND,
] as const;

// ── Watch Category Helpers ──

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

// ── Flag Category Helpers ──

/**
 * Look up a flag category by its semantic ID.
 * @throws If no category exists for the given ID
 */
export function findFlagCategoryById(id: FlagCategoryId): FlagCategory {
  const cat = ALL_FLAG_CATEGORIES.find((c) => c.id === id);
  if (!cat) {
    throw new Error(`Invalid flag category id: ${id}`);
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
 * Check whether a ticker matches a given flag category's criteria.
 */
function matchesFlagCategory(categoryId: FlagCategoryId, ticker: Ticker): boolean {
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
    if (matchesFlagCategory(id, ticker)) {
      return findFlagCategoryById(id);
    }
  }
  return undefined;
}
