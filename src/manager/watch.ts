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
   * @param selectedTickers List of selected tickers
   */
  recordCategory(categoryIndex: number, selectedTickers: string[]): void;

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
 * Manages watch category operations
 */
export class WatchManager implements IWatchManager {
  DEFAULT_LIST_INDEX = 5;
  constructor(private readonly watchRepo: IWatchlistRepo) {}

  /** @inheritdoc */
  getCategory(categoryIndex: number): Set<string> {
    const categoryLists = this.watchRepo.getWatchCategoryLists();
    const list = categoryLists.getList(categoryIndex);
    if (!list) {
      categoryLists.setList(categoryIndex, new Set());
      throw new Error(`Category list for index ${categoryIndex} not found`);
    }
    return list;
  }

  /** @inheritdoc */
  recordCategory(categoryIndex: number, selectedTickers: string[]): void {
    const categoryLists = this.watchRepo.getWatchCategoryLists();
    this.recordCategoryInternal(categoryLists, categoryIndex, selectedTickers);
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
    this.signalWatchChange().catch(console.error);
  }

  /** @inheritdoc */
  dryRunClean(): number {
    return this.processCleanup(false);
  }

  /** @inheritdoc */
  clean(): number {
    return this.processCleanup(true);
  }

  /** @inheritdoc */
  getDefaultWatchlist(): Set<string> {
    return this.getCategory(this.DEFAULT_LIST_INDEX);
  }

  /** @inheritdoc */
  private async signalWatchChange(): Promise<void> {
    await this.watchRepo.createWatchChangeEvent();
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
  private processCleanup(executeChanges: boolean): number {
    let count = 0;
    const categoryLists = this.watchRepo.getWatchCategoryLists();
    const watchListTickers = categoryLists.getList(5) || new Set();

    categoryLists.getLists().forEach((list, key) => {
      for (const ticker of [...list]) {
        if (!watchListTickers.has(ticker)) {
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
