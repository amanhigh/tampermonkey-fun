import { ITickerManager } from './ticker';
import { IJournalManager } from './journal';
import { Notifier } from '../util/notify';
import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { JournalRecord } from '../models/journal';
import { WatchCategory, WatchCategoryId } from '../models/watch';
import { findWatchCategoryById, resolveWatchCategory } from './watch_category';

/**
 * Interface for managing watch category operations.
 *
 * All classification is backend-on-demand — no local snapshot.
 * DEFAULT_DAILY is NOT resolved here; callers supply the TV watchlist
 * when they want the default-watchlist fallback applied.
 */
export interface IWatchManager {
  /**
   * Get the watch category for a single ticker.
   * @param tvTicker Ticker symbol to look up
   * @param defaultWatchlistTickers Current TV watchlist tickers (optional, needed for DEFAULT_DAILY)
   * @returns Promise resolving to the category or undefined
   */
  getTickerCategory(tvTicker: string, defaultWatchlistTickers?: readonly string[]): Promise<WatchCategory | undefined>;

  /**
   * Get watch categories for multiple tickers in one backend call.
   * @param tvTickers Ticker symbols to classify
   * @param defaultWatchlistTickers Current TV watchlist tickers (optional, needed for DEFAULT_DAILY)
   * @returns Promise resolving to a map of ticker → category for matched tickers only
   */
  getTickerCategories(
    tvTickers: readonly string[],
    defaultWatchlistTickers?: readonly string[]
  ): Promise<Map<string, WatchCategory>>;

  /**
   * Records selected tickers in the given watch category.
   * Fires async backend updates for supported categories.
   * @param categoryId Category identifier to record into
   * @param tvTickers List of ticker symbols to assign
   */
  recordCategory(categoryId: WatchCategoryId, tvTickers: string[]): void;
}

/**
 * Manages watch category operations using backend-on-demand classification.
 *
 * No snapshot — every call to getTickerCategory/getTickerCategories fetches
 * backend data fresh. Journal manager is injected as a lazy getter to avoid
 * circular dependency at factory construction time.
 */
export class WatchManager implements IWatchManager {
  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly getJournalManager: () => IJournalManager
  ) {}

  /** @inheritdoc */
  async getTickerCategory(
    tvTicker: string,
    defaultWatchlistTickers?: readonly string[]
  ): Promise<WatchCategory | undefined> {
    const map = await this.getTickerCategories([tvTicker], defaultWatchlistTickers);
    return map.get(tvTicker);
  }

  /** @inheritdoc */
  async getTickerCategories(
    tvTickers: readonly string[],
    defaultWatchlistTickers?: readonly string[]
  ): Promise<Map<string, WatchCategory>> {
    const journalManager = this.getJournalManager();

    const [allTickers, setJournals, runningJournals] = await Promise.all([
      this.tickerManager.listTickers({}),
      journalManager.listJournals({ status: 'SET' }),
      journalManager.listJournals({ status: 'RUNNING' }),
    ]);

    const allBackendCategories = this.classifyAllTickers(allTickers, setJournals, runningJournals);
    return this.buildCategoryMap(tvTickers, allBackendCategories, defaultWatchlistTickers);
  }

  /** @inheritdoc */
  recordCategory(categoryId: WatchCategoryId, tvTickers: string[]): void {
    const cat = findWatchCategoryById(categoryId);

    if (cat.recordUpdate === null) {
      Notifier.warn(`Category ${categoryId} does not support manual recording`);
      return;
    }

    for (const ticker of tvTickers) {
      void this.updateBackend(ticker, cat.recordUpdate);
    }
  }

  // ── Classification helpers ──

  /**
   * Build a complete classification map from backend data.
   * Priority: SET journal > RUNNING journal > ticker-derived categories.
   */
  private classifyAllTickers(
    allTickers: Ticker[],
    setJournals: JournalRecord[],
    runningJournals: JournalRecord[]
  ): Map<string, WatchCategoryId> {
    const result = new Map<string, WatchCategoryId>();

    // 1. SET journals (highest priority)
    for (const j of setJournals) {
      result.set(j.ticker, WatchCategoryId.SET_JOURNAL);
    }

    // 2. RUNNING journals (won't overwrite SET)
    for (const j of runningJournals) {
      if (!result.has(j.ticker)) {
        result.set(j.ticker, WatchCategoryId.RUNNING_JOURNAL);
      }
    }

    // 3. Backend ticker records (skip journal-covered)
    for (const ticker of allTickers) {
      if (!result.has(ticker.ticker)) {
        const id = resolveWatchCategory(ticker);
        if (id !== undefined) {
          result.set(ticker.ticker, id);
        }
      }
    }

    return result;
  }

  /**
   * Build the result map for only the requested tickers.
   * Falls back to DEFAULT_DAILY for tickers in the TV watchlist.
   */
  private buildCategoryMap(
    tvTickers: readonly string[],
    allBackendCategories: Map<string, WatchCategoryId>,
    defaultWatchlistTickers?: readonly string[]
  ): Map<string, WatchCategory> {
    const categoryMap = new Map<string, WatchCategory>();
    const defaultList = defaultWatchlistTickers ? new Set(defaultWatchlistTickers) : new Set<string>();

    for (const tvTicker of tvTickers) {
      const backendId = allBackendCategories.get(tvTicker);
      if (backendId !== undefined) {
        categoryMap.set(tvTicker, findWatchCategoryById(backendId));
      } else if (defaultList.has(tvTicker)) {
        categoryMap.set(tvTicker, findWatchCategoryById(WatchCategoryId.DEFAULT_DAILY));
      }
    }

    return categoryMap;
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
