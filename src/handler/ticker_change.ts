import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';
import { ITickerManager } from '../manager/ticker';
import { IAlertHandler } from './alert';
import { IHeaderManager } from '../manager/header';
import { IRecentManager } from '../manager/recent';
import { ISequenceHandler } from './sequence';
import { IKiteHandler } from './kite';
import { ISyncUtil } from '../util/sync';

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
    private readonly syncUtil: ISyncUtil
  ) {}

  public onTickerChange(): void {
    this.syncUtil.waitOn('tickerChange', 150, () => {
      // Refresh alerts for current ticker
      this.alertHandler.refreshAlerts();

      // Update UI components
      this.headerManager.paintHeader();
      this.recordRecentTicker();
      this.sequenceHandler.displaySequence();

      // Handle GTT operations
      this.kiteHandler
        .refreshGttOrders()
        .catch((error) => Notifier.error(`Failed to refresh GTT orders: ${error.message}`));
    });
  }

  private recordRecentTicker(): void {
    const recentEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.RECENT}`).prop('checked');
    const ticker = this.tickerManager.getTicker();

    if (recentEnabled && !this.recentManager.isRecent(ticker)) {
      this.recentManager.addTicker(ticker);
      // TODO: this.watchlistManager.paintAlertFeedEvent()
    }
  }
}
