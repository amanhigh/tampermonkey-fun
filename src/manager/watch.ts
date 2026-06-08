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
 * Manages watch category operations using backend-on-demand classification.
 *
 * No snapshot — every call to getTickerCategory fetches
 * backend data fresh. Journal manager is injected as a lazy getter to avoid
 * circular dependency at factory construction time.
 */
export class WatchManager implements IWatchManager {
  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly getJournalManager: () => IJournalManager
  ) {}

  /** @inheritdoc */
  async getTickerCategory(tvTicker: string): Promise<WatchCategory | undefined> {
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
      void this.updateBackend(ticker, cat.recordUpdate);
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
