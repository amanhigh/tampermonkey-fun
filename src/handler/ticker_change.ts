import { ITickerManager } from '../manager/ticker';
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
    private readonly tickerManager: ITickerManager,
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
      this.headerManager.paintHeader();
      this.recordRecentTicker();
      this.sequenceHandler.displaySequence();

      // Update Screener
      if (this.screenManager.isScreenerVisible()) {
        this.screenManager.paintScreener();
      }

      // Handle GTT operations
      void this.kiteHandler.refreshGttOrders();
    });
  }

  private recordRecentTicker(): void {
    const tvTicker = this.tickerManager.getTicker();
    if (!this.recentManager.isRecent(tvTicker)) {
      this.recentManager.addTicker(tvTicker);

      // Paint if TV ticker is not in watchlist
      if (!this.watchManager.isWatched(tvTicker)) {
        void this.alertFeedManager.createAlertFeedEvent(tvTicker);
      }
    }
  }
}
