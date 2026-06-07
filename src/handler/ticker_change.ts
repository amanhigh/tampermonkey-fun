import { IDomManager } from '../manager/dom';
import { IAlertHandler } from './alert';
import { IHeaderManager } from '../manager/header';
import { IRecentManager } from '../manager/recent';
import { ISequenceHandler } from './sequence';
import { IKiteHandler } from './kite';
import { ISyncUtil } from '../util/sync';
import { IWatchManager } from '../manager/watch';
import { IAlertFeedManager } from '../manager/alertfeed';
import { ITradingViewScreenerManager } from '../manager/screener';

export interface ITickerChangeHandler {
  onTickerChange(): void;
}

export class TickerChangeHandler implements ITickerChangeHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly domManager: IDomManager,
    private readonly alertHandler: IAlertHandler,
    private readonly headerManager: IHeaderManager,
    private readonly recentManager: IRecentManager,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly kiteHandler: IKiteHandler,
    private readonly syncUtil: ISyncUtil,
    private readonly watchManager: IWatchManager,
    private readonly alertFeedManager: IAlertFeedManager,
    private readonly screenManager: ITradingViewScreenerManager
  ) {}

  public onTickerChange(): void {
    this.syncUtil.waitOn('tickerChange', 150, () => {
      // Refresh alerts for current ticker
      this.alertHandler.refreshAlerts();

      // Update UI components
      void this.headerManager.paintHeader();
      void this.recordRecentTicker();
      void this.sequenceHandler.displaySequence();

      // Update Screener
      if (this.screenManager.isScreenerVisible()) {
        void this.screenManager.paintScreener();
      }

      // Handle GTT operations
      void this.kiteHandler.refreshGttOrders();
    });
  }

  private async recordRecentTicker(): Promise<void> {
    const tvTicker = this.domManager.getTicker();
    this.recentManager.markRecent(tvTicker);

    // Paint if TV ticker is not in any watch category
    const category = await this.watchManager.getTickerCategory(tvTicker);
    if (!category) {
      void this.alertFeedManager.createAlertFeedEvent(tvTicker);
    }
  }
}
