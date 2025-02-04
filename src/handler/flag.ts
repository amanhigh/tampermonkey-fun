// CREATE NEW FILE: src/handler/flag.ts
import { IFlagManager } from '../manager/flag';
import { ITickerManager } from '../manager/ticker';
import { IWatchListHandler } from './watchlist';

/**
 * Handles flag-related operations and UI updates
 */
export interface IFlagHandler {
  /**
   * Record current selected ticker in flag category and trigger UI updates
   * @param categoryIndex Category index to record into
   */
  recordSelectedTicker(categoryIndex: number): void;
}

/**
 * Implementation of flag operation handlers
 */
export class FlagHandler implements IFlagHandler {
  constructor(
    private readonly flagManager: IFlagManager,
    private readonly tickerManager: ITickerManager,
    private readonly watchHandler: IWatchListHandler
  ) {}

  /** @inheritdoc */
  public recordSelectedTicker(categoryIndex: number): void {
    const tvTicker = this.tickerManager.getTicker();
    this.flagManager.recordCategory(categoryIndex, [tvTicker]);
    this.watchHandler.onWatchListChange();
  }
}
