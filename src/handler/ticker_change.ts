import { IDomManager } from '../manager/dom';
import { IAlertHandler } from './alert';
import { IPaintManager } from '../manager/paint';
import { IRecentManager } from '../manager/recent';
import { ISyncUtil } from '../util/sync';

export interface ITickerChangeHandler {
  onTickerChange(): void;
}

/**
 * Handles ticker change events from the DOM observer.
 *
 * Delegates to sub-handlers. Decoupled consumers (TimeFrame, Display, Kite, etc.)
 * listen to the TICKER_CHANGED domain event published by RecentManager.markRecent().
 */
export class TickerChangeHandler implements ITickerChangeHandler {
  constructor(
    private readonly domManager: IDomManager,
    private readonly alertHandler: IAlertHandler,
    private readonly paintManager: IPaintManager,
    private readonly recentManager: IRecentManager,
    private readonly syncUtil: ISyncUtil
  ) {}

  public onTickerChange(): void {
    this.syncUtil.waitOn('tickerChange', 150, () => {
      // Refresh alerts for current ticker
      this.alertHandler.refreshAlerts();

      // Update UI components — paintTickers handles WATCHLIST + SCREENER (if visible) + header
      void this.paintManager.paintTickers([this.domManager.getTicker()]);
      void this.recordRecentTicker();
    });
  }

  private recordRecentTicker(): void {
    const tvTicker = this.domManager.getTicker();
    this.recentManager.markRecent(tvTicker);
  }
}
