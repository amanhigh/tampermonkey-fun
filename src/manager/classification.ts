import { Constants } from '../models/constant';
import { Ticker, TickerType, TickerState, TickerTrend } from '../models/ticker';
import { ALL_WATCH_CATEGORIES, WatchCategory, WatchCategoryId } from '../models/watch';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';

// ════════════════════════════════════════════
// WatchClassifier
// ════════════════════════════════════════════

/**
 * Static classifier for watch-category resolution.
 *
 * All methods are pure — no state, no side effects.
 */
export class WatchClassifier {
  /**
   * Look up a watch category by its semantic ID.
   * @throws If no category exists for the given ID
   */
  static findById(id: WatchCategoryId): WatchCategory {
    const cat = ALL_WATCH_CATEGORIES.find((c) => c.id === id);
    if (!cat) {
      throw new Error(`Invalid watch category id: ${id}`);
    }
    return cat;
  }

  /**
   * Find the highest-priority watch category for a ticker based on
   * backend fields only. Does NOT resolve DEFAULT_DAILY — callers
   * must apply that fallback when the ticker is present in the TV watchlist.
   *
   * Returns undefined if the ticker does not match any backend-derived category.
   */
  static findByTicker(ticker: Ticker): WatchCategory | undefined {
    // BLACKLIST state takes highest priority
    if (ticker.state === TickerState.BLACKLIST) {
      return this.findById(WatchCategoryId.BLACKLISTED);
    }

    // READY
    if (ticker.state === TickerState.READY) {
      return this.findById(WatchCategoryId.READY);
    }

    if (ticker.type === TickerType.COMPOSITE) {
      // Composite instruments (type takes priority over timeframe-based classification)
      return this.findById(WatchCategoryId.COMPOSITE);
    }

    if (Constants.FLAGS.INDEX_TICKER_TYPES.includes(ticker.type)) {
      // Market instruments (INDEX, COMMODITY, FX, BOND)
      return this.findById(WatchCategoryId.INDEX);
    }

    if (this.isLongWatch(ticker)) {
      // Long-watch (timeframes no DL), split by exchange
      return this.isIndiaExchange(ticker)
        ? this.findById(WatchCategoryId.LONG_NSE)
        : this.findById(WatchCategoryId.LONG_NON_NSE);
    }

    // else: undefined (DEFAULT_DAILY fallback)
    return undefined;
  }

  /**
   * Check whether a ticker's timeframes make it a long-watch candidate
   * (does not contain DL).
   */
  private static isLongWatch(ticker: Ticker): boolean {
    return !ticker.timeframes.includes('DL');
  }

  /**
   * Check whether a ticker is India-listed based on exchange.
   */
  private static isIndiaExchange(ticker: Ticker): boolean {
    return ticker.exchange === 'NSE';
  }
}

// ════════════════════════════════════════════
// FlagClassifier
// ════════════════════════════════════════════

/** Priority-ordered list of flag category IDs used by FlagClassifier.findByTicker(). */
const FLAG_CATEGORY_PRIORITY: readonly FlagCategoryId[] = [
  FlagCategoryId.GOLD_INDEX,
  FlagCategoryId.INDEX,
  FlagCategoryId.CRYPTO,
  FlagCategoryId.UPTREND,
  FlagCategoryId.SIDEWAYS,
  FlagCategoryId.DOWNTREND,
] as const;

/**
 * Static classifier for flag-category resolution.
 *
 * All methods are pure — no state, no side effects.
 */
export class FlagClassifier {
  /**
   * Look up a flag category by its semantic ID.
   * @throws If no category exists for the given ID
   */
  static findById(id: FlagCategoryId): FlagCategory {
    const cat = ALL_FLAG_CATEGORIES.find((c) => c.id === id);
    if (!cat) {
      throw new Error(`Invalid flag category id: ${id}`);
    }
    return cat;
  }

  /**
   * Find the highest-priority flag category for a ticker.
   * Returns undefined if no category matches (unclassified ticker).
   */
  static findByTicker(ticker: Ticker): FlagCategory | undefined {
    for (const id of FLAG_CATEGORY_PRIORITY) {
      if (this.matchesCategory(id, ticker)) {
        return this.findById(id);
      }
    }
    return undefined;
  }

  /**
   * Check whether a ticker symbol is gold-index related.
   */
  private static isGoldIndexSymbol(ticker: string): boolean {
    const upper = ticker.toUpperCase();
    return Constants.FLAGS.GOLD_INDEX_TOKENS.some((token) => upper.includes(token));
  }

  /**
   * Check whether a ticker type is a market instrument (INDEX, COMPOSITE, COMMODITY, FX, BOND).
   */
  private static isMarket(ticker: Ticker): boolean {
    return Constants.FLAGS.INDEX_TICKER_TYPES.includes(ticker.type) || ticker.type === TickerType.COMPOSITE;
  }

  /**
   * Check whether a ticker matches a given flag category's criteria.
   */
  private static matchesCategory(categoryId: FlagCategoryId, ticker: Ticker): boolean {
    switch (categoryId) {
      case FlagCategoryId.GOLD_INDEX:
        return this.isMarket(ticker) && this.isGoldIndexSymbol(ticker.ticker);
      case FlagCategoryId.INDEX:
        return this.isMarket(ticker);
      case FlagCategoryId.CRYPTO:
        return ticker.type === TickerType.CRYPTO;
      case FlagCategoryId.UPTREND:
        return ticker.trend === TickerTrend.UPTREND;
      case FlagCategoryId.SIDEWAYS:
        return ticker.trend === TickerTrend.SIDEWAYS;
      case FlagCategoryId.DOWNTREND:
        return ticker.trend === TickerTrend.DOWNTREND;
      default:
        return false;
    }
  }
}
