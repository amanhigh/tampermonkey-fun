import { CategoryLists } from '../models/category';
import { Constants } from '../models/constant';
import { IWatchlistRepo } from '../repo/watch';

/**
 * Interface for managing watch category operations
 */
export interface IWatchManager {
  /**
   * Gets order category set by index
   * @param categoryIndex Category index
   * @returns Set of symbols in category
   */
  getCategory(categoryIndex: number): Set<string>;

  /**
   * Get default watchlist (Index 5)
   * @returns Set of default watchlist symbols
   * */
  getDefaultWatchlist(): Set<string>;

  /**
   * Computes Default Watchlist based on other Lists.
   * @param tvWatchlistTickers Latest watchlist tickers in TradingView for Universe
   */
  computeDefaultList(tvWatchlistTickers: string[]): void;

  /**
   * Records selected tickers in order category
   * @param categoryIndex Category index to record into
   * @param tvTickers List of selected tickers
   */
  recordCategory(categoryIndex: number, tvTickers: string[]): void;

  /**
   * Check how many order items would be removed by cleanup
   * @param currentTickers List of current tickers in watchlist
   * @returns Number of items that would be removed
   */
  dryRunClean(currentTickers: string[]): number;

  /**
   * Remove order items not in watchlist and save changes
   * @param currentTickers List of current tickers in watchlist
   * @returns Number of items removed
   */
  clean(currentTickers: string[]): number;

  /**
   * Check if a ticker is in any watch category
   * @param tvTicker TradingView ticker symbol
   * @returns True if ticker is in any watch category
   */
  isWatched(tvTicker: string): boolean;
}

/**
 * Manages watch category operations
 */
export class WatchManager implements IWatchManager {
  DEFAULT_LIST_INDEX = 5;
  private readonly TOTAL_CATEGORIES = 8; // Based on UI.COLORS.LIST length

  constructor(private readonly watchRepo: IWatchlistRepo) {
    const categoryLists = this.watchRepo.getWatchCategoryLists();
    this.initializeCategoryLists(categoryLists);
  }

  private initializeCategoryLists(categoryLists: CategoryLists): void {
    // Initialize empty sets for all required categories (0-7)
    for (let i = 0; i < this.TOTAL_CATEGORIES; i++) {
      if (!categoryLists.getList(i)) {
        categoryLists.setList(i, new Set());
      }
    }
  }
  /** @inheritdoc */
  public getCategory(categoryIndex: number): Set<string> {
    if (categoryIndex < 0 || categoryIndex >= this.TOTAL_CATEGORIES) {
      throw new Error(`Invalid category index: ${categoryIndex}. Must be between 0 and ${this.TOTAL_CATEGORIES - 1}`);
    }

    const categoryLists = this.watchRepo.getWatchCategoryLists();
    const list = categoryLists.getList(categoryIndex);
    if (!list) {
      categoryLists.setList(categoryIndex, new Set());
      throw new Error(`Category list for index ${categoryIndex} not found`);
    }
    return list;
  }

  /** @inheritdoc */
  recordCategory(categoryIndex: number, tvTickers: string[]): void {
    const categoryLists = this.watchRepo.getWatchCategoryLists();
    this.recordCategoryInternal(categoryLists, categoryIndex, tvTickers);
  }

  /** @inheritdoc */
  computeDefaultList(tvWatchlistTickers: string[]): void {
    //Prep Watchlist Set with all Symbols not in other Order Sets
    const tvWatchSet = new Set(tvWatchlistTickers);
    const categoryLists = this.watchRepo.getWatchCategoryLists();
    // Remove tickers from other categories (except index 5 which is watchlist)
    for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
      if (i !== this.DEFAULT_LIST_INDEX) {
        // Skip watchlist category
        const categorySet = categoryLists.getList(i);
        if (categorySet) {
          categorySet.forEach((ticker) => tvWatchSet.delete(ticker));
        }
      }
    }

    // Update watchlist category
    categoryLists.setList(this.DEFAULT_LIST_INDEX, tvWatchSet);
  }

  /** @inheritdoc */
  dryRunClean(currentTickers: string[]): number {
    return this.processCleanup(currentTickers, false);
  }

  /** @inheritdoc */
  clean(currentTickers: string[]): number {
    return this.processCleanup(currentTickers, true);
  }

  /** @inheritdoc */
  getDefaultWatchlist(): Set<string> {
    return this.getCategory(this.DEFAULT_LIST_INDEX);
  }

  /** @inheritdoc */
  public isWatched(tvTicker: string): boolean {
    const allWatchedItems = this.watchRepo.getAllItems();
    return allWatchedItems.has(tvTicker);
  }

  /**
   * Records tickers in specified category
   * @private
   * @param categoryLists Category lists to update
   * @param categoryIndex Category index
   * @param tickers Tickers to record
   */
  private recordCategoryInternal(categoryLists: CategoryLists, categoryIndex: number, tickers: string[]): void {
    tickers.forEach((ticker) => {
      categoryLists.toggle(categoryIndex, ticker);
    });
  }

  /**
   * Process cleanup of order items not in watchlist
   * @private
   * @param executeChanges Whether to actually remove items and save
   * @returns Number of items affected
   */
  private processCleanup(currentTickers: string[], executeChanges: boolean): number {
    let count = 0;
    const categoryLists = this.watchRepo.getWatchCategoryLists();
    // BUG: Clean should display Notification.
    const watchListTickers = new Set(currentTickers);

    categoryLists.getLists().forEach((list, key) => {
      for (const ticker of [...list]) {
        if (!watchListTickers.has(ticker)) {
          console.log(`Removing ${ticker} from category ${key}`);
          if (executeChanges) {
            categoryLists.delete(key, ticker);
          }
          count++;
        }
      }
    });

    return count;
  }
}
