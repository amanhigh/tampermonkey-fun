import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { ITickerManager } from './ticker';
import { IPaintManager } from './paint';
import { Notifier } from '../util/notify';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';
import { findFlagCategoryById } from './flag_category';
import { resolveFlagCategory } from './flag_category';

/**
 * Interface for managing flag-based ticker categories.
 * paint() fetches fresh backend data every call. getTickerCategory() returns
 * the category for a given ticker from the last paint snapshot.
 */
export interface IFlagManager {
  /**
   * Gets the flag category for a ticker from the last paint snapshot.
   * Returns undefined if the ticker is not present in any flag category.
   * @param ticker Ticker symbol to look up
   */
  getTickerCategory(ticker: string): FlagCategory | undefined;

  /**
   * Records selected tickers in the given flag category.
   * Fires an async backend `updateTicker()` per ticker using the category's
   * defined update payload.
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
 * No persistent cache — `paint()` fetches fresh data every time.
 * `getTickerCategory()` returns the last paint snapshot for synchronous consumers.
 *
 * Classification logic (which category a ticker belongs to) is delegated to
 * the flag_category resolver module.
 */
export class FlagManager implements IFlagManager {
  /**
   * Snapshot from the last paint call: category ID → set of ticker symbols.
   */
  private lastPaintGroups: Map<FlagCategoryId, Set<string>> = new Map();

  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly paintManager: IPaintManager
  ) {
    this.lastPaintGroups = this.createEmptyCategoryGroups();
  }

  // ── Public API ──

  /** @inheritdoc */
  getTickerCategory(ticker: string): FlagCategory | undefined {
    for (const cat of ALL_FLAG_CATEGORIES) {
      const symbols = this.lastPaintGroups.get(cat.id);
      if (symbols?.has(ticker)) {
        return cat;
      }
    }
    return undefined;
  }

  /** @inheritdoc */
  recordCategory(categoryId: FlagCategoryId, tvTickers: string[]): void {
    const cat = findFlagCategoryById(categoryId);

    for (const ticker of tvTickers) {
      // Fire async backend update — no local cache mutation
      void this.updateBackend(ticker, cat.update);
    }
  }

  /** @inheritdoc */
  paint(selector: string, itemSelector: string): void {
    void this.paintFromBackend(selector, itemSelector);
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
   * Fetch tickers from the backend, group them into category sets,
   * and paint each category.
   */
  private async paintFromBackend(selector: string, itemSelector: string): Promise<void> {
    try {
      const tickers = await this.tickerManager.listTickers({});
      const freshGroups = this.groupTickersByCategory(tickers);

      // Update snapshot for synchronous getTickerCategory() consumers
      this.lastPaintGroups = freshGroups;

      // Paint flags for every category in UI order
      this.paintGroups(selector, itemSelector, freshGroups);
    } catch {
      // Backend call failed — keep existing snapshot, paint nothing new
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
