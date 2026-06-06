import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { ITickerClient } from '../client/ticker';
import { IPaintManager } from './paint';
import { Notifier } from '../util/notify';
import { ALL_FLAG_CATEGORIES } from '../models/flag';
import { findFlagCategoryByIndex, resolveFlagCategory } from './flag_category';

/**
 * Interface for managing flag-based ticker categories.
 * paint() fetches fresh backend data every call. getCategory() returns the last
 * paint snapshot for synchronous compatibility.
 */
export interface IFlagManager {
  /**
   * Gets flag category set by index from the last paint snapshot.
   * Returns empty set if no paint has run yet.
   * @param index Category index (0-7)
   */
  getCategory(index: number): Set<string>;

  /**
   * Records selected tickers in the given flag category.
   * Fires an async backend `updateTicker()` per ticker using the category's
   * defined update payload.
   * @param index Category index (0-7)
   * @param tvTickers List of ticker symbols to assign
   */
  recordCategory(index: number, tvTickers: string[]): void;

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
 * `getCategory()` returns the last paint snapshot for synchronous consumers.
 *
 * Classification logic (which category a ticker belongs to) is delegated to
 * the flag_category resolver module.
 */
export class FlagManager implements IFlagManager {
  /**
   * Snapshot from the last paint call: category index → set of ticker symbols.
   */
  private lastPaintGroups: Map<number, Set<string>> = new Map();

  constructor(
    private readonly tickerClient: ITickerClient,
    private readonly paintManager: IPaintManager
  ) {
    this.lastPaintGroups = this.createEmptyCategoryGroups();
  }

  // ── Public API ──

  /** @inheritdoc */
  getCategory(index: number): Set<string> {
    findFlagCategoryByIndex(index); // validates index exists
    return this.lastPaintGroups.get(index) ?? new Set();
  }

  /** @inheritdoc */
  recordCategory(index: number, tvTickers: string[]): void {
    const cat = findFlagCategoryByIndex(index);

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
      await this.tickerClient.updateTicker(ticker, update);
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
      const tickers = await this.tickerClient.listTickers({});
      const freshGroups = this.groupTickersByCategory(tickers);

      // Update snapshot for synchronous getCategory() consumers
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
  private createEmptyCategoryGroups(): Map<number, Set<string>> {
    const groups = new Map<number, Set<string>>();
    for (const cat of ALL_FLAG_CATEGORIES) {
      groups.set(cat.index, new Set());
    }
    return groups;
  }

  /**
   * Group a list of ticker records into flag category sets.
   */
  private groupTickersByCategory(tickers: Ticker[]): Map<number, Set<string>> {
    const groups = this.createEmptyCategoryGroups();

    // Classify each ticker into the first matching category
    for (const ticker of tickers) {
      const cat = resolveFlagCategory(ticker);
      groups.get(cat.index)?.add(ticker.ticker);
    }

    return groups;
  }

  /**
   * Paint flags for every category using the given group sets.
   */
  private paintGroups(selector: string, itemSelector: string, groups: Map<number, Set<string>>): void {
    for (const cat of ALL_FLAG_CATEGORIES) {
      const symbols = groups.get(cat.index) ?? new Set();
      this.paintManager.paintFlags(selector, symbols, cat.color, itemSelector);
    }
  }
}
