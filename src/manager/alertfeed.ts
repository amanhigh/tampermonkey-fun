import { AlertFeedEvent, FeedInfo, FeedState } from '../models/alertfeed';
import { Constants } from '../models/constant';
import { ISymbolManager } from './symbol';
import { IWatchManager } from './watch';
import { IRecentManager } from './recent';

/**
 * Interface for managing alert feed state
 */
export interface IAlertFeedManager {
  /**
   * Get the alert feed state for a specific investing ticker
   * @param investingTicker The investing ticker to retrieve state for
   * @returns The FeedInfo containing state and color
   */
  getAlertFeedState(investingTicker: string): FeedInfo;

  /**
   * Create an alert feed event for a specific ticker
   * @param tvTicker The investing ticker to create event for
   * @returns Promise that resolves when event is created
   */
  createAlertFeedEvent(tvTicker: string): Promise<void>;

  /**
   * Create a reset feed event
   * @returns Promise that resolves when event is created
   */
  createResetFeedEvent(): Promise<void>;
}

/**
 * Implementation of IAlertFeedManager
 */
export class AlertFeedManager implements IAlertFeedManager {
  constructor(
    private readonly symbolManager: ISymbolManager,
    private readonly watchManager: IWatchManager,
    private readonly recentManager: IRecentManager
  ) {}

  public getAlertFeedState(investingTicker: string): FeedInfo {
    const tvTicker = this.symbolManager.investingToTv(investingTicker);

    if (!tvTicker) {
      return { state: FeedState.UNMAPPED, color: 'red' };
    }

    if (this.watchManager.isWatched(tvTicker)) {
      return { state: FeedState.WATCHED, color: 'yellow' };
    }

    if (this.recentManager.isRecent(tvTicker)) {
      return { state: FeedState.RECENT, color: 'lime' };
    }

    return { state: FeedState.MAPPED, color: 'white' };
  }

  public async createAlertFeedEvent(tvTicker: string): Promise<void> {
    const investingTicker = this.symbolManager.tvToInvesting(tvTicker);
    if (!investingTicker) {
      throw new Error(`Failed to convert ticker: ${tvTicker}`);
    }
    const feedInfo = this.getAlertFeedState(investingTicker);
    const event = new AlertFeedEvent(investingTicker, feedInfo);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }

  public async createResetFeedEvent(): Promise<void> {
    // Special values to Paint all tickers during Reset
    const event = new AlertFeedEvent(Constants.MISC.RESET_FEED, { state: FeedState.UNMAPPED, color: 'red' });
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }
}
