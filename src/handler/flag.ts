// CREATE NEW FILE: src/handler/flag.ts
import { IFlagManager } from '../manager/flag';
import { ITradingViewManager } from '../manager/tv';

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
    private readonly tvManager: ITradingViewManager
  ) {}

  /** @inheritdoc */
  public recordSelectedTicker(categoryIndex: number): void {
    const symbol = this.tvManager.getName();
    this.flagManager.recordCategory(categoryIndex, [symbol]);
  }
}
