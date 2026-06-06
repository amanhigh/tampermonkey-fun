import { Ticker } from '../models/ticker';
import { Constants } from '../models/constant';
import { ALL_FLAG_CATEGORIES, FlagCategory, FlagCategoryId } from '../models/flag';

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

// ── Lookup ──

/**
 * Look up a flag category by its numeric index.
 * @throws If no category exists for the given index
 */
export function findFlagCategoryByIndex(index: number): FlagCategory {
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
function findFlagCategoryById(id: FlagCategoryId): FlagCategory {
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
 * Check whether a ticker matches a given category's criteria.
 */
function matchesCategory(categoryId: FlagCategoryId, ticker: Ticker): boolean {
  switch (categoryId) {
    case 'GOLD_INDEX':
      return ticker.type === 'COMPOSITE' && isGoldIndexSymbol(ticker.ticker);
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
  return findFlagCategoryById('DEFAULT_UNTRACKED');
}
