// CREATE NEW FILE: src/handler/flag.ts
import { IFlagManager } from '../manager/flag';
import { IDomManager } from '../manager/dom';
import { IWatchListHandler } from './watchlist';
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
    private readonly flagManager: IFlagManager,
    private readonly domManager: IDomManager,
    private readonly watchHandler: IWatchListHandler
  ) {}

  /** @inheritdoc */
  public recordSelectedTicker(categoryId: FlagCategoryId): void {
    const tvTicker = this.domManager.getTicker();
    this.flagManager.recordCategory(categoryId, [tvTicker]);
    this.watchHandler.onWatchListChange();
  }
}
