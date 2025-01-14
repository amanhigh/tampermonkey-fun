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
      this.kiteHandler.refreshGttOrders().catch((error) => console.error('Failed to refresh GTT orders:', error));
    });
  }

  private recordRecentTicker(): void {
    const tvTicker = this.tickerManager.getTicker();
    if (!this.recentManager.isRecent(tvTicker)) {
      this.recentManager.addTicker(tvTicker);
      // TODO: #A this.watchlistManager.paintAlertFeedEvent()
    }
  }
}
