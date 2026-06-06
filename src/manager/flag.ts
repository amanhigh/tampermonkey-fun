import { Constants } from '../models/constant';
import { ITickerClient } from '../client/ticker';
import { Ticker, TickerUpdateRequest } from '../models/ticker';
import { IPaintManager } from './paint';
import { Notifier } from '../util/notify';

/**
 * Interface for managing flag-based ticker categories.
 * paint() fetches fresh backend data every call. getCategory() returns the last
 * paint snapshot for synchronous compatibility.
 */
export interface IFlagManager {
  /**
   * Gets flag category set by index from the last paint snapshot.
   * Returns empty set if no paint has run yet.
   * @param categoryIndex Category index (0-7)
   */
  getCategory(categoryIndex: number): Set<string>;

  /**
   * Records selected tickers in flag category.
   * Fires async backend ticker update per ticker.
   * Category 3 and 5 are unused and produce a warning.
   * @param categoryIndex Category index to record into
   * @param tvTickers List of selected tickers
   */
  recordCategory(categoryIndex: number, tvTickers: string[]): void;

  /**
   * Paint flag indicators based on backend ticker data.
   * Fetches fresh listTickers({}) every call.
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

const TOTAL_CATEGORIES = 8;

/**
 * Manages flag-based sets of tickers using backend calls per paint.
 * No persistent cache — paint() fetches fresh data every time.
 * getCategory() returns the last paint snapshot for synchronous consumers.
 */
export class FlagManager implements IFlagManager {
  /**
   * Snapshot from the last paint call.
   * categoryIndex → set of ticker strings.
   */
  private lastPaintGroups: Map<number, Set<string>> = new Map();

  /**
   * @param tickerClient Client for backend ticker CRUD
   * @param paintManager Manager for painting flag indicators
   */
  constructor(
    private readonly tickerClient: ITickerClient,
    private readonly paintManager: IPaintManager
  ) {
    // Initialize empty sets for all categories
    for (let i = 0; i < TOTAL_CATEGORIES; i++) {
      this.lastPaintGroups.set(i, new Set());
    }
  }

  // ── Category Mapping Helpers ──

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
    if (categoryIndex < 0 || categoryIndex >= TOTAL_CATEGORIES) {
      throw new Error(`Invalid category index: ${categoryIndex}. Must be between 0 and ${TOTAL_CATEGORIES - 1}`);
    }
    return this.lastPaintGroups.get(categoryIndex) ?? new Set();
  }

  /** @inheritdoc */
  recordCategory(categoryIndex: number, tvTickers: string[]): void {
    if (categoryIndex < 0 || categoryIndex >= TOTAL_CATEGORIES) {
      throw new Error(`Invalid category index: ${categoryIndex}. Must be between 0 and ${TOTAL_CATEGORIES - 1}`);
    }

    if (UNSUPPORTED_CATEGORIES.has(categoryIndex)) {
      Notifier.warn(`Category ${categoryIndex} is not supported for storage`);
      return;
    }

    for (const ticker of tvTickers) {
      // Fire async backend update — no local cache mutation
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
  paint(selector: string, itemSelector: string): void {
    void this.paintFromBackend(selector, itemSelector);
  }

  /**
   * Fetches fresh ticker data from backend, groups by flag category,
   * paints all flag indicators.
   */
  private async paintFromBackend(selector: string, itemSelector: string): Promise<void> {
    try {
      const tickers = await this.tickerClient.listTickers({});
      const freshGroups = this.groupTickersByCategory(tickers);

      // Update snapshot for sync getCategory() consumers
      this.lastPaintGroups = freshGroups;

      // Paint flags for each category
      const colorList = Constants.UI.COLORS.LIST;
      for (let i = 0; i < colorList.length; i++) {
        const color = colorList[i];
        const flagSymbols = freshGroups.get(i) ?? new Set();
        this.paintManager.paintFlags(selector, flagSymbols, color, itemSelector);
      }
    } catch {
      // If backend call fails, paint nothing new
    }
  }

  /**
   * Groups fresh ticker records into flag category sets.
   */
  private groupTickersByCategory(tickers: Ticker[]): Map<number, Set<string>> {
    const groups = new Map<number, Set<string>>();
    for (let i = 0; i < TOTAL_CATEGORIES; i++) {
      groups.set(i, new Set());
    }

    for (const ticker of tickers) {
      const category = this.resolveCategory(ticker);
      if (category >= 0) {
        groups.get(category)?.add(ticker.ticker);
      }
    }

    return groups;
  }
}
