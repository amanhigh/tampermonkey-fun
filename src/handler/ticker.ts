import { Constants } from '../models/constant';
import { IWaitUtil } from '../util/wait';
import { IPaintManager } from '../manager/paint';
import { ITradingViewScreenerManager } from '../manager/screener';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { IKiteHandler } from './kite';
import { Notifier } from '../util/notify';
import { ITickerManager } from '../manager/ticker';
import { IRecentManager } from '../manager/recent';
import { SyncUtil } from '../util/sync';
import { ISequenceHandler } from './sequence';

/**
 * Interface for managing ticker operations
 */
export interface ITickerHandler {
  /**
   * Handles ticker change operations and updates UI
   */
  onTickerChange(): void;

  /**
   * Handles recent ticker reset functionality
   */
  onRencentReset(): void;
}

/**
 * Handles ticker operations and related UI updates
 */
export class TickerHandler implements ITickerHandler {
  constructor(
    private readonly recentManager: IRecentManager,
    private readonly tickerManager: ITickerManager,
    private readonly waitUtil: IWaitUtil,
    private readonly paintManager: IPaintManager,
    private readonly screenerManager: ITradingViewScreenerManager,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly kiteHandler: IKiteHandler,
    private readonly syncUtil: SyncUtil
  ) {}

  /**
   * Handles ticker change operations and updates UI
   */
  public onTickerChange(): void {
    //HACK: Make Event Based when New Ticker Appears
    // FIXME: Change with Sync Util which has this func.
    this.syncUtil.waitOn('tickerChange', 150, () => {
      // TODO: AlertRefreshLocal - Not yet migrated to typescript
      this.alertRefreshLocal();

      // Update UI components
      this.paintManager.paintHeader();
      this.recordRecentTicker();
      this.sequenceHandler.displaySequence();

      // Handle GTT operations
      // FIXME: Pass GttOrderMap from Kite Manager
      this.kiteHandler.gttSummary();
    });
  }

  /**
   * Handles recent ticker reset functionality
   */
  public onRencentReset(): void {
    const recentEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.RECENT}`).prop('checked');

    if (recentEnabled) {
      Notifier.success('Recent Enabled');
    } else {
      this.recentManager.clearRecent();
      this.screenerManager.paintScreener();
      this.watchlistManager.paintAlertFeedEvent().catch(() => {
        Notifier.error('Error updating watchlist');
      });
      Notifier.error('Recent Disabled');
    }
  }

  /**
   * Record recent ticker when enabled
   * @private
   */
  private recordRecentTicker(): void {
    const recentEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.RECENT}`).prop('checked');
    const ticker = this.tickerManager.getTicker();

    if (recentEnabled && !this.recentManager.isRecent(ticker)) {
      this.recentManager.addTicker(ticker);
      this.screenerManager.paintScreener();
      this.watchlistManager.paintAlertFeedEvent().catch(() => {
        Notifier.error('Error updating watchlist');
      });
    }
  }

  /**
   * TODO: Placeholder for AlertRefreshLocal functionality
   * To be implemented when alert system is migrated
   * @private
   */
  private alertRefreshLocal(): void {
    // Placeholder for alert refresh functionality
  }
}
