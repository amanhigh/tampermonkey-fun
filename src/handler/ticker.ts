import { Constants } from '../models/constant';
import { IRecentTickerRepo } from '../repo/recent';
import { IWaitUtil } from '../util/wait';
import { IPaintManager } from '../manager/paint';
import { ITradingViewScreenerManager } from '../manager/screener';
import { ISequenceManager } from '../manager/sequence';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { IKiteHandler } from '../handler/kite';
import { Notifier } from '../util/notify';

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
    private readonly recentRepo: IRecentTickerRepo,
    private readonly waitUtil: IWaitUtil,
    private readonly paintManager: IPaintManager,
    private readonly screenerManager: ITradingViewScreenerManager,
    private readonly sequenceManager: ISequenceManager,
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly kiteHandler: IKiteHandler
  ) {}

  /**
   * Handles ticker change operations and updates UI
   */
  public onTickerChange(): void {
    //HACK: Make Event Based when New Ticker Appears
    this.waitUtil.waitOn('tickerChange', 150, () => {
      // TODO: AlertRefreshLocal - Not yet migrated to typescript
      this.alertRefreshLocal();

      // Update UI components
      this.paintManager.paintHeader();
      this.recordRecentTicker();
      // FIXME: Pass GttOrderMap from Kite Manager
      this.sequenceManager.displaySequence();

      // Handle GTT operations
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
      // FIXME: Interact with Recent Manager ?
      this.recentRepo.clear();
      this.screenerManager.paintScreener();
      // FIXME: Asyc await
      this.watchlistManager.paintAlertFeedEvent();
      Notifier.error('Recent Disabled');
    }
  }

  /**
   * Record recent ticker when enabled
   * @private
   */
  private recordRecentTicker(): void {
    const recentEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.RECENT}`).prop('checked');
    // FIXME: Use Ticker Manager to get Ticker
    const ticker = this.paintManager.getName();

    // FIXME: Use isRecent from Ticker Manager
    if (recentEnabled && !this.recentRepo.has(ticker)) {
      // FIXME: Use Recent Manager to add
      this.recentRepo.add(ticker);
      this.screenerManager.paintScreener();
      // FIXME: Handle async
      this.watchlistManager.paintAlertFeedEvent();
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
