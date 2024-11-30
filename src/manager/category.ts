import { Constants } from '../models/constant';
import { CategoryLists } from '../models/category';
import { IWatchlistRepo } from '../repo/watch';
import { IFlagRepo } from '../repo/flag';

type WatchlistManager = {
  getTickers(): string[];
};

/**
 * Interface for managing category-based sets of tickers
 */
export interface ICategoryManager {
  /**
   * Gets order category set by index
   * @param categoryIndex Category index
   * @returns Set of symbols in category
   */
  getOrderCategory(categoryIndex: number): Set<string>;

  /**
   * Gets flag category set by index
   * @param categoryIndex Category index
   * @returns Set of symbols in category
   */
  getFlagCategory(categoryIndex: number): Set<string>;

  /**
   * Records selected tickers in order category
   * @param categoryIndex Category index to record into
   * @param selectedTickers List of selected tickers
   */
  recordOrderCategory(categoryIndex: number, selectedTickers: string[]): void;

  /**
   * Records selected tickers in flag category
   * @param categoryIndex Category index to record into
   * @param selectedTickers List of selected tickers
   */
  recordFlagCategory(categoryIndex: number, selectedTickers: string[]): void;

  /**
   * Updates watchlist category (index 5) with remaining tickers
   * @param watchListTickers Current watchlist tickers
   */
  updateWatchlistCategory(watchListTickers: string[]): void;

  /**
   * Check how many order items would be removed by cleanup
   * @returns Number of items that would be removed
   */
  dryRunClean(): number;

  /**
   * Remove order items not in watchlist and save changes
   * @returns Number of items removed
   */
  clean(): number;
}

/**
 * Manages category-based sets of tickers
 */
export class CategoryManager implements ICategoryManager {
  // TODO: Route CategoryRepo Calls via this Manager
  /**
   * @param orderRepo Repository for order categories
   * @param flagRepo Repository for flag categories
   * @param watchlistManager Watchlist manager
   */
  constructor(
    private readonly _orderRepo: IWatchlistRepo,
    private readonly _flagRepo: IFlagRepo,
    private readonly _watchlistManager: WatchlistManager
  ) {}

  /** @inheritdoc */
  getOrderCategory(categoryIndex: number): Set<string> {
    const categoryLists = this._orderRepo.getWatchCategoryLists();
    const list = categoryLists.getList(categoryIndex);
    if (!list) {
      throw new Error(`Category list for index ${categoryIndex} not found`);
    }
    return list;
  }

  /** @inheritdoc */
  getFlagCategory(categoryIndex: number): Set<string> {
    const categoryLists = this._flagRepo.getFlagCategoryLists();
    const list = categoryLists.getList(categoryIndex);
    if (!list) {
      throw new Error(`Category list for index ${categoryIndex} not found`);
    }
    return list;
  }

  /** @inheritdoc */
  recordOrderCategory(categoryIndex: number, selectedTickers: string[]): void {
    const categoryLists = this._orderRepo.getWatchCategoryLists();
    this._recordCategory(categoryLists, categoryIndex, selectedTickers);
  }

  /** @inheritdoc */
  recordFlagCategory(categoryIndex: number, selectedTickers: string[]): void {
    const categoryLists = this._flagRepo.getFlagCategoryLists();
    this._recordCategory(categoryLists, categoryIndex, selectedTickers);
  }

  /** @inheritdoc */
  updateWatchlistCategory(watchListTickers: string[]): void {
    //Prep Watchlist Set with all Symbols not in other Order Sets
    const watchSet = new Set(watchListTickers);
    const orderLists = this._orderRepo.getWatchCategoryLists();

    // Remove tickers from other categories (except index 5 which is watchlist)
    for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
      if (i !== 5) {
        // Skip watchlist category
        const categorySet = orderLists.getList(i);
        if (categorySet) {
          categorySet.forEach((ticker) => watchSet.delete(ticker));
        }
      }
    }

    // Update watchlist category
    orderLists.setList(5, watchSet);
  }

  /** @inheritdoc */
  dryRunClean(): number {
    return this._processCleanup(false);
  }

  /** @inheritdoc */
  clean(): number {
    return this._processCleanup(true);
  }

  /**
   * Records tickers in specified category
   * @private
   * @param categoryLists Category lists to update
   * @param categoryIndex Category index
   * @param tickers Tickers to record
   */
  private _recordCategory(categoryLists: CategoryLists, categoryIndex: number, tickers: string[]): void {
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
  private _processCleanup(executeChanges: boolean): number {
    const watchListTickers = this._watchlistManager.getTickers();
    let count = 0;

    const categoryLists = this._orderRepo.getWatchCategoryLists();

    categoryLists.getLists().forEach((list, key) => {
      for (const ticker of [...list]) {
        if (!watchListTickers.includes(ticker)) {
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
