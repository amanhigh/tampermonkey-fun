import { CategoryLists } from '../models/category';
import { Constants } from '../models/constant';
import { IFlagRepo } from '../repo/flag';
import { IPaintManager } from './paint';

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
   * Records selected tickers in flag category
   * @param categoryIndex Category index to record into
   * @param selectedTickers List of selected tickers
   */
  recordCategory(categoryIndex: number, selectedTickers: string[]): void;

  /**
   * Paint flag indicators based on category colors
   * @param selector Selector for ticker elements
   */
  paint(selector: string): void;
}

/**
 * Manages flag-based sets of tickers
 */
export class FlagManager implements IFlagManager {
  constructor(
    private readonly flagRepo: IFlagRepo,
    private readonly paintManager: IPaintManager
  ) {}

  /** @inheritdoc */
  getCategory(categoryIndex: number): Set<string> {
    const categoryLists = this.flagRepo.getFlagCategoryLists();
    const list = categoryLists.getList(categoryIndex);
    if (!list) {
      throw new Error(`Category list for index ${categoryIndex} not found`);
    }
    return list;
  }

  /** @inheritdoc */
  recordCategory(categoryIndex: number, selectedTickers: string[]): void {
    const categoryLists = this.flagRepo.getFlagCategoryLists();
    this._recordCategory(categoryLists, categoryIndex, selectedTickers);
  }

  /** @inheritdoc */
  paint(selector: string): void {
    const colorList = Constants.UI.COLORS.LIST;

    // Paint flags for each category
    for (let i = 0; i < colorList.length; i++) {
      const color = colorList[i];
      const flagSymbols = this.getCategory(i);
      this.paintManager.paintFlags(selector, flagSymbols, color);
    }
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
}
