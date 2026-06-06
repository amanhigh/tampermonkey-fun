import { Constants } from '../models/constant';
import { ITickerClient } from '../client/ticker';
import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { IPaintManager } from './paint';
import { Notifier } from '../util/notify';

/**
 * Interface for managing flag-based ticker categories
 */
export interface IFlagManager {
  /**
   * Gets flag category set by index
   * @param categoryIndex Category index
   * @returns Set of symbols in category
   */
  getCategory(categoryIndex: number): Set<string>;

  /**
   * Records selected tickers in flag category.
   * For supported categories this fires an async backend ticker update.
   * Category 3 and 5 are unused and produce a warning.
   * @param categoryIndex Category index to record into
   * @param tvTickers List of selected tickers
   */
  recordCategory(categoryIndex: number, tvTickers: string[]): void;

  /**
   * Evicts ticker from all flag categories if present.
   * Does not persist backend state — just removes from display cache.
   * @param tvTicker Ticker to evict
   * @returns True if ticker was found and removed, false if not found
   */
  evictTicker(tvTicker: string): boolean;

  /**
   * Paint flag indicators based on category colors
   * @param selector Selector for ticker elements
   * @param itemSelector Selector for item container
   */
  paint(selector: string, itemSelector: string): void;
}

/**
 * Trend categories that write back to ticker.trend on the backend.
 */
const TREND_CATEGORIES: Record<number, string> = {
  0: 'SIDEWAYS',
  1: 'DOWNTREND',
  4: 'UPTREND',
};

/**
 * Type categories that write back to ticker.type on the backend.
 */
const TYPE_CATEGORIES: Record<number, string> = {
  2: 'CRYPTO',
  6: 'INDEX',
  7: 'COMPOSITE',
};

/**
 * Categories that do not map to a backend field and are intentionally unused.
 */
const UNSUPPORTED_CATEGORIES = new Set([3, 5]);

/**
 * Display priority order: type/composite categories first, then trend categories.
 * A ticker is placed in the first matching category.
 */
const CATEGORY_PRIORITY = [7, 2, 6, 4, 0, 1];

/**
 * Manages flag-based sets of tickers using a backend-backed cache.
 * Cache is loaded asynchronously on construction from TickerClient.
 * All public read methods are synchronous cache reads.
 */
export class FlagManager implements IFlagManager {
  /** Display-priority-ordered cache: index → set of ticker strings. */
  private readonly cache: Map<number, Set<string>> = new Map();

  private readonly TOTAL_CATEGORIES = 8;

  /**
   * @param tickerClient Client for backend ticker CRUD
   * @param paintManager Manager for painting flag indicators
   */
  constructor(
    private readonly tickerClient: ITickerClient,
    private readonly paintManager: IPaintManager
  ) {
    // Initialize empty sets for all categories
    for (let i = 0; i < this.TOTAL_CATEGORIES; i++) {
      this.cache.set(i, new Set());
    }
    void this.loadCache();
  }

  // ── Cache Loading ──

  /**
   * Loads all tickers from backend and indexes them into category sets.
   * Fire-and-forget; cache stays empty on failure.
   */
  private async loadCache(): Promise<void> {
    try {
      const tickers = await this.tickerClient.listTickers({});
      // Reset cache
      for (const [, set] of this.cache) {
        set.clear();
      }
      // Classify each ticker into one display category
      for (const ticker of tickers) {
        const category = this.resolveCategory(ticker);
        if (category >= 0) {
          this.cache.get(category)?.add(ticker.ticker);
        }
      }
    } catch {
      // Cache stays empty on failure — retry on next operation
    }
  }

  /**
   * Resolves a ticker to its display flag category index.
   * Priority: gold-composite (7) > crypto (2) > market-type (6) > trend (4/0/1).
   * @param ticker Ticker record from backend
   * @returns Category index, or -1 if no category matches
   */
  private resolveCategory(ticker: Ticker): number {
    for (const catIdx of CATEGORY_PRIORITY) {
      if (this.matchesCategory(catIdx, ticker)) {
        return catIdx;
      }
    }
    return -1;
  }

  /**
   * Checks whether a ticker belongs to a given category.
   */
  private matchesCategory(catIdx: number, ticker: Ticker): boolean {
    switch (catIdx) {
      case 7:
        return ticker.type === 'COMPOSITE' && this.isGoldRelative(ticker.ticker);
      case 2:
        return ticker.type === 'CRYPTO';
      case 6:
        return ['INDEX', 'COMMODITY', 'FX', 'BOND'].includes(ticker.type);
      case 0:
        return ticker.trend === 'SIDEWAYS';
      case 1:
        return ticker.trend === 'DOWNTREND';
      case 4:
        return ticker.trend === 'UPTREND';
      default:
        return false;
    }
  }

  /**
   * Determines if a ticker symbol is gold-relative for category 7 classification.
   */
  private isGoldRelative(ticker: string): boolean {
    const upper = ticker.toUpperCase();
    return upper.includes('XAUUSD') || upper.includes('GOLDSILVER');
  }

  // ── Public API ──

  /** @inheritdoc */
  getCategory(categoryIndex: number): Set<string> {
    if (categoryIndex < 0 || categoryIndex >= this.TOTAL_CATEGORIES) {
      throw new Error(`Invalid category index: ${categoryIndex}. Must be between 0 and ${this.TOTAL_CATEGORIES - 1}`);
    }
    return this.cache.get(categoryIndex) ?? new Set();
  }

  /** @inheritdoc */
  recordCategory(categoryIndex: number, tvTickers: string[]): void {
    if (categoryIndex < 0 || categoryIndex >= this.TOTAL_CATEGORIES) {
      throw new Error(`Invalid category index: ${categoryIndex}. Must be between 0 and ${this.TOTAL_CATEGORIES - 1}`);
    }

    if (UNSUPPORTED_CATEGORIES.has(categoryIndex)) {
      Notifier.warn(`Category ${categoryIndex} is not supported for storage`);
      return;
    }

    for (const ticker of tvTickers) {
      // Remove from all categories first (mutual exclusivity)
      for (const [, set] of this.cache) {
        set.delete(ticker);
      }
      // Add to target category cache
      this.cache.get(categoryIndex)?.add(ticker);

      // Fire async backend update
      void this.updateBackend(ticker, categoryIndex);
    }
  }

  /**
   * Persists a category assignment to the backend.
   * @param ticker Ticker symbol
   * @param categoryIndex Target flag category
   */
  private async updateBackend(ticker: string, categoryIndex: number): Promise<void> {
    const update: TickerUpdateRequest = {};

    if (categoryIndex in TREND_CATEGORIES) {
      update.trend = TREND_CATEGORIES[categoryIndex] as TickerUpdateRequest['trend'];
    } else if (categoryIndex in TYPE_CATEGORIES) {
      update.type = TYPE_CATEGORIES[categoryIndex] as TickerUpdateRequest['type'];
    }

    try {
      await this.tickerClient.updateTicker(ticker, update);
    } catch {
      Notifier.warn(`Failed to update flag category for ${ticker}`);
    }
  }

  /** @inheritdoc */
  evictTicker(tvTicker: string): boolean {
    let removed = false;
    for (const [, set] of this.cache) {
      if (set.has(tvTicker)) {
        set.delete(tvTicker);
        removed = true;
      }
    }
    return removed;
  }

  /** @inheritdoc */
  paint(selector: string, itemSelector: string): void {
    const colorList = Constants.UI.COLORS.LIST;

    for (let i = 0; i < colorList.length; i++) {
      const color = colorList[i];
      const flagSymbols = this.getCategory(i);
      this.paintManager.paintFlags(selector, flagSymbols, color, itemSelector);
    }
  }
}
