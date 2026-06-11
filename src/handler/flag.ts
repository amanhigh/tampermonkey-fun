import { ICategoryManager } from '../manager/category';
import { IDomManager } from '../manager/dom';
import { IPaintManager } from '../manager/paint';
import { FlagCategoryId } from '../models/flag';

/**
 * Handles flag-related operations and UI updates
 */
export interface IFlagHandler {
  /**
   * Record current selected ticker in flag category and trigger UI updates
   * @param categoryId Flag category identifier to record into
   */
  recordSelectedTicker(categoryId: FlagCategoryId): void;
}

/**
 * Implementation of flag operation handlers
 */
export class FlagHandler implements IFlagHandler {
  constructor(
    private readonly categoryManager: ICategoryManager,
    private readonly domManager: IDomManager,
    private readonly paintManager: IPaintManager
  ) {}

  /** @inheritdoc */
  public recordSelectedTicker(categoryId: FlagCategoryId): void {
    const tvTicker = this.domManager.getTicker();
    this.categoryManager.recordFlagCategory(categoryId, [tvTicker]);

    // paintTickers handles WATCHLIST + SCREENER (if visible) + header
    void this.paintManager.paintTickers([tvTicker]);
  }
}
