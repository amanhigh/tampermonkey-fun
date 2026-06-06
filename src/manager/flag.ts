import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { ITickerClient } from '../client/ticker';
import { IPaintManager } from './paint';
import { Notifier } from '../util/notify';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';
import { Constants } from '../models/constant';

/**
 * Priority-ordered list of category IDs used by resolveFlagCategory().
 * Order: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND
 */
const FLAG_CATEGORY_PRIORITY: readonly FlagCategoryId[] = [
  'GOLD_INDEX',
  'INDEX',
  'CRYPTO',
  'UPTREND',
  'SIDEWAYS',
  'DOWNTREND',
] as const;

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
 * Classification logic (which category a ticker belongs to) lives here in
 * private helpers rather than in the model layer.
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
    // Initialise empty sets for every category so getCategory() always
    // returns a known set before the first paint.
    for (const cat of ALL_FLAG_CATEGORIES) {
      this.lastPaintGroups.set(cat.index, new Set());
    }
  }

  // ── Public API ──

  /** @inheritdoc */
  getCategory(index: number): Set<string> {
    this.findCategoryByIndex(index); // validates index exists
    return this.lastPaintGroups.get(index) ?? new Set();
  }

  /** @inheritdoc */
  recordCategory(index: number, tvTickers: string[]): void {
    const cat = this.findCategoryByIndex(index);

    for (const ticker of tvTickers) {
      // Fire async backend update — no local cache mutation
      void this.updateBackend(ticker, cat.update);
    }
  }

  /** @inheritdoc */
  paint(selector: string, itemSelector: string): void {
    void this.paintFromBackend(selector, itemSelector);
  }

  // ── Category lookup ──

  /**
   * Look up a flag category by its numeric index.
   * @throws If no category exists for the given index
   */
  private findCategoryByIndex(index: number): FlagCategory {
    const cat = ALL_FLAG_CATEGORIES.find((c) => c.index === index);
    if (!cat) {
      throw new Error(`Invalid category index: ${index}. Must be between 0 and ${ALL_FLAG_CATEGORIES.length - 1}`);
    }
    return cat;
  }

  /**
   * Look up a flag category by its semantic ID.
   * @throws If no category exists for the given ID
   */
  private findCategoryById(id: FlagCategoryId): FlagCategory {
    const cat = ALL_FLAG_CATEGORIES.find((c) => c.id === id);
    if (!cat) {
      throw new Error(`Invalid category id: ${id}`);
    }
    return cat;
  }

  // ── Ticker classification ──

  /**
   * Check whether a ticker symbol is gold-index related.
   * A gold-index symbol is a composite expression containing XAUUSD or GOLDSILVER.
   */
  private isGoldIndexSymbol(ticker: string): boolean {
    const upper = ticker.toUpperCase();
    return Constants.FLAGS.GOLD_INDEX_TOKENS.some((token) => upper.includes(token));
  }

  /**
   * Check whether a ticker matches a given category's criteria.
   */
  private matchesCategory(categoryId: FlagCategoryId, ticker: Ticker): boolean {
    switch (categoryId) {
      case 'GOLD_INDEX':
        return ticker.type === 'COMPOSITE' && this.isGoldIndexSymbol(ticker.ticker);
      case 'INDEX':
        return Constants.FLAGS.INDEX_TICKER_TYPES.includes(ticker.type);
      case 'CRYPTO':
        return ticker.type === 'CRYPTO';
      case 'UPTREND':
        return ticker.trend === 'UPTREND';
      case 'SIDEWAYS':
        return ticker.trend === 'SIDEWAYS';
      case 'DOWNTREND':
        return ticker.trend === 'DOWNTREND';
      case 'DEFAULT_UNTRACKED':
        return false;
    }
  }

  /**
   * Find the highest-priority flag category for a ticker.
   * Falls back to DEFAULT_UNTRACKED if no other category matches.
   */
  private resolveFlagCategory(ticker: Ticker): FlagCategory {
    for (const id of FLAG_CATEGORY_PRIORITY) {
      if (this.matchesCategory(id, ticker)) {
        return this.findCategoryById(id);
      }
    }
    return this.findCategoryById('DEFAULT_UNTRACKED');
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
      for (const cat of ALL_FLAG_CATEGORIES) {
        const symbols = freshGroups.get(cat.index) ?? new Set();
        this.paintManager.paintFlags(selector, symbols, cat.color, itemSelector);
      }
    } catch {
      // Backend call failed — keep existing snapshot, paint nothing new
    }
  }

  /**
   * Group a list of ticker records into flag category sets.
   */
  private groupTickersByCategory(tickers: Ticker[]): Map<number, Set<string>> {
    const groups = new Map<number, Set<string>>();

    // Initialise all categories
    for (const cat of ALL_FLAG_CATEGORIES) {
      groups.set(cat.index, new Set());
    }

    // Classify each ticker into the first matching category
    for (const ticker of tickers) {
      const cat = this.resolveFlagCategory(ticker);
      groups.get(cat.index)?.add(ticker.ticker);
    }

    return groups;
  }
}
