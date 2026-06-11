import { IDomManager } from '../manager/dom';
import { IAlertHandler } from './alert';
import { IPaintManager } from '../manager/paint';
import { IRecentManager } from '../manager/recent';
import { ISequenceHandler } from './sequence';
import { IKiteHandler } from './kite';
import { ISyncUtil } from '../util/sync';
import { IWatchManager } from '../manager/watch';
import { IAlertFeedManager } from '../manager/alertfeed';

export interface ITickerChangeHandler {
  onTickerChange(): void;
}

export class TickerChangeHandler implements ITickerChangeHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly domManager: IDomManager,
    private readonly alertHandler: IAlertHandler,
    private readonly paintManager: IPaintManager,
    private readonly recentManager: IRecentManager,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly kiteHandler: IKiteHandler,
    private readonly syncUtil: ISyncUtil,
    private readonly watchManager: IWatchManager,
    private readonly alertFeedManager: IAlertFeedManager
  ) {}

  public onTickerChange(): void {
    this.syncUtil.waitOn('tickerChange', 150, () => {
      // Refresh alerts for current ticker
      this.alertHandler.refreshAlerts();

      // Update UI components — paintTickers handles WATCHLIST + SCREENER (if visible) + header
      void this.paintManager.paintTickers([this.domManager.getTicker()]);
      void this.recordRecentTicker();
      void this.sequenceHandler.displaySequence();

      // Handle GTT operations
      void this.kiteHandler.refreshGttOrders();
    });
  }

  private recordRecentTicker(): void {
    const tvTicker = this.domManager.getTicker();
    this.recentManager.markRecent(tvTicker);

    // Paint if TV ticker is not in any watch category
    void this.watchManager.getTickerCategory(tvTicker).then((category) => {
      if (!category) {
        void this.alertFeedManager.createAlertFeedEvent(tvTicker);
      }
    });
  }
}
