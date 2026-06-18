import { IDomManager } from '../manager/dom';
import { IRecentManager } from '../manager/recent';
import { ISyncUtil } from '../util/sync';

export interface ITickerChangeHandler {
  onTickerChange(): void;
}

/**
 * Handles ticker change events from the DOM observer.
 *
 * Delegates to RecentManager which publishes TICKER_CHANGED.
 * All other consumers (Display, TimeFrame, AlertSummary, etc.)
 * react to that domain event.
 */
export class TickerChangeHandler implements ITickerChangeHandler {
  constructor(
    private readonly domManager: IDomManager,
    private readonly recentManager: IRecentManager,
    private readonly syncUtil: ISyncUtil
  ) {}

  public onTickerChange(): void {
    this.syncUtil.waitOn('tickerChange', 150, () => {
      const tvTicker = this.domManager.getTicker();
      this.recentManager.markRecent(tvTicker);
    });
  }
}
