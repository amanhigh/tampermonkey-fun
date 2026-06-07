import { ITickerManager } from './ticker';
import { IJournalManager } from './journal';
import { Notifier } from '../util/notify';
import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { JournalRecord } from '../models/journal';
import { WATCH_CATEGORY_COUNT } from '../models/watch';
import { findWatchCategoryByIndex, journalTickerSet, resolveWatchCategory } from './watch_category';

/**
 * Interface for managing watch category operations.
 *
 * Categories are derived from backend ticker and journal data.
 * Sync methods read from a snapshot that is refreshed async by
 * `computeDefaultList()`.
 */
export interface IWatchManager {
  /**
   * Gets order category set by index
   * @param categoryIndex Category index
   * @returns Set of symbols in category
   */
  getCategory(categoryIndex: number): Set<string>;

  /**
   * Computes Default Watchlist based on other Lists.
   * Triggers an async backend refresh to derive categories.
   * @param tvWatchlistTickers Latest watchlist tickers in TradingView for Universe
   */
  computeDefaultList(tvWatchlistTickers: string[]): void;

  /**
   * Records selected tickers in order category.
   * Fires async backend updates for supported categories.
   * @param categoryIndex Category index to record into
   * @param tvTickers List of selected tickers
   */
  recordCategory(categoryIndex: number, tvTickers: string[]): void;

  /**
   * Check if a ticker is in any watch category
   * @param tvTicker TradingView ticker symbol
   * @returns True if ticker is in any watch category
   */
  isWatched(tvTicker: string): boolean;
}

/**
 * Manages watch category operations using backend-derived data.
 *
 * Categories are built from async backend fetches (tickers + journals)
 * and cached in a snapshot for synchronous UI consumers.
 *
 * The journal manager is injected as a lazy getter to avoid circular
 * dependency at factory construction time (watch → journal → sequence →
 * dom → screener → watch). The getter is only called during the async
 * backend refresh, by which point all factory singletons are cached.
 */
export class WatchManager implements IWatchManager {
  DEFAULT_LIST_INDEX = 5;
  private readonly TOTAL_CATEGORIES = WATCH_CATEGORY_COUNT;

  /** Snapshot from the last backend refresh: category index → set of ticker symbols. */
  private lastCategoryGroups: Map<number, Set<string>> = new Map();

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly getJournalManager: () => IJournalManager
  ) {
    this.initializeEmptySnapshot();
  }

  /**
   * Initialize empty sets for all categories.
   */
  private initializeEmptySnapshot(): void {
    for (let i = 0; i < this.TOTAL_CATEGORIES; i++) {
      this.lastCategoryGroups.set(i, new Set());
    }
  }

  /** @inheritdoc */
  public getCategory(categoryIndex: number): Set<string> {
    if (categoryIndex < 0 || categoryIndex >= this.TOTAL_CATEGORIES) {
      throw new Error(`Invalid category index: ${categoryIndex}. Must be between 0 and ${this.TOTAL_CATEGORIES - 1}`);
    }

    return this.lastCategoryGroups.get(categoryIndex) ?? new Set();
  }

  /** @inheritdoc */
  computeDefaultList(tvWatchlistTickers: string[]): void {
    // If snapshot is empty (first call before any backend refresh),
    // use TV watchlist tickers as fallback in category 5
    const hasData = Array.from(this.lastCategoryGroups.values()).some((s) => s.size > 0);
    if (!hasData && tvWatchlistTickers.length > 0) {
      this.lastCategoryGroups.set(this.DEFAULT_LIST_INDEX, new Set(tvWatchlistTickers));
    }

    // Fire async backend refresh
    void this.refreshFromBackend(tvWatchlistTickers);
  }

  /** @inheritdoc */
  recordCategory(categoryIndex: number, tvTickers: string[]): void {
    let cat;
    try {
      cat = findWatchCategoryByIndex(categoryIndex);
    } catch {
      Notifier.warn(`Category ${categoryIndex} does not support manual recording`);
      return;
    }

    if (cat.recordUpdate === null) {
      Notifier.warn(`Category ${categoryIndex} does not support manual recording`);
      return;
    }

    for (const ticker of tvTickers) {
      void this.updateBackend(ticker, cat.recordUpdate);
    }
  }

  /** @inheritdoc */
  public isWatched(tvTicker: string): boolean {
    for (const set of this.lastCategoryGroups.values()) {
      if (set.has(tvTicker)) {
        return true;
      }
    }
    return false;
  }

  // ── Backend Refresh ──

  /**
   * Fetch tickers and journals from backend, derive categories,
   * and update the local snapshot.
   */
  private async refreshFromBackend(tvWatchlistTickers: string[]): Promise<void> {
    try {
      const journalManager = this.getJournalManager();
      const [allTickers, setJournals, runningJournals] = await Promise.all([
        this.tickerManager.listTickers({}),
        journalManager.listJournals({ status: 'SET' }),
        journalManager.listJournals({ status: 'RUNNING' }),
      ]);

      this.buildCategorySnapshot(allTickers, setJournals, runningJournals, tvWatchlistTickers);
    } catch (error) {
      // Backend call failed — keep existing snapshot unchanged
      Notifier.warn(`Failed to refresh watch categories from backend: ${(error as Error).message}`);
    }
  }

  /**
   * Build category snapshot from backend data using PRD derivation rules.
   */
  private buildCategorySnapshot(
    allTickers: Ticker[],
    setJournals: JournalRecord[],
    runningJournals: JournalRecord[],
    tvWatchlistTickers: string[]
  ): void {
    const freshGroups = this.createEmptyGroups();

    // ── Journal-derived categories ──

    // Category 0: tickers with SET journal status
    freshGroups.set(0, journalTickerSet(setJournals));

    // Category 4: tickers with RUNNING journal status
    freshGroups.set(4, journalTickerSet(runningJournals));

    // Collect all journal tickers to exclude from ticker-derived categories
    const journalTickers = new Set([...freshGroups.get(0)!, ...freshGroups.get(4)!]);

    // ── Ticker-derived categories (first-match priority) ──

    const assignedToNonDefault = new Set<string>();

    for (const ticker of allTickers) {
      // Skip tickers already in journal categories
      if (journalTickers.has(ticker.ticker)) {
        assignedToNonDefault.add(ticker.ticker);
        continue;
      }

      const category = resolveWatchCategory(ticker);
      if (category !== undefined) {
        freshGroups.get(category)?.add(ticker.ticker);
        assignedToNonDefault.add(ticker.ticker);
      }
    }

    // Category 5: TV watchlist tickers not assigned to any other category
    const defaultTickers = new Set<string>();
    for (const t of tvWatchlistTickers) {
      if (!assignedToNonDefault.has(t) && !journalTickers.has(t)) {
        defaultTickers.add(t);
      }
    }
    freshGroups.set(5, defaultTickers);

    // Update snapshot
    this.lastCategoryGroups = freshGroups;
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

  // ── Helpers ──

  /**
   * Create a new map with empty sets for every category.
   */
  private createEmptyGroups(): Map<number, Set<string>> {
    const groups = new Map<number, Set<string>>();
    for (let i = 0; i < this.TOTAL_CATEGORIES; i++) {
      groups.set(i, new Set());
    }
    return groups;
  }
}
