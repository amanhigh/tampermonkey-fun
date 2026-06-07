import { Ticker } from '../models/ticker';
import { Constants } from '../models/constant';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';

/**
 * Priority-ordered list of category IDs used by resolveFlagCategory().
 * Order: GOLD_INDEX > INDEX > CRYPTO > UPTREND > SIDEWAYS > DOWNTREND
 */
const FLAG_CATEGORY_PRIORITY: readonly FlagCategoryId[] = [
  FlagCategoryId.GOLD_INDEX,
  FlagCategoryId.INDEX,
  FlagCategoryId.CRYPTO,
  FlagCategoryId.UPTREND,
  FlagCategoryId.SIDEWAYS,
  FlagCategoryId.DOWNTREND,
] as const;

// ── Lookup ──

/**
 * Look up a flag category by its semantic ID.
 * @throws If no category exists for the given ID
 */
export function findFlagCategoryById(id: FlagCategoryId): FlagCategory {
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
 * Check whether a ticker matches a given category's criteria.
 */
function matchesCategory(categoryId: FlagCategoryId, ticker: Ticker): boolean {
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
    case FlagCategoryId.DEFAULT_UNTRACKED:
      return false;
  }
}

// ── Resolver ──

/**
 * Find the highest-priority flag category for a ticker.
 * Falls back to DEFAULT_UNTRACKED if no other category matches.
 */
export function resolveFlagCategory(ticker: Ticker): FlagCategory {
  for (const id of FLAG_CATEGORY_PRIORITY) {
    if (matchesCategory(id, ticker)) {
      return findFlagCategoryById(id);
    }
  }
  return findFlagCategoryById(FlagCategoryId.DEFAULT_UNTRACKED);
}
