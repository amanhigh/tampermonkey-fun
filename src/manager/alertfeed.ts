import { AlertFeedEvent, FeedInfo, FeedState } from '../models/alertfeed';
import { Constants } from '../models/constant';
import { IAlertTickerManager } from './alert_ticker';
import { ICategoryManager } from './category';
import { IRecentManager } from './recent';

/**
 * Interface for managing alert feed state
 */
export interface IAlertFeedManager {
  /**
   * Get the alert feed state for a specific investing ticker
   * @param investingTicker The investing ticker to retrieve state for
   * @returns Promise resolving to FeedInfo containing state and color
   */
  getAlertFeedState(investingTicker: string): Promise<FeedInfo>;

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
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly categoryManager: ICategoryManager,
    private readonly recentManager: IRecentManager
  ) {}

  public async getAlertFeedState(investingTicker: string): Promise<FeedInfo> {
    const alertTicker = await this.alertTickerManager.fetchAlertTicker(investingTicker);

    if (!alertTicker) {
      return { state: FeedState.UNMAPPED, color: 'red' };
    }

    const tvTicker = alertTicker.ticker;

    // Check if ticker belongs to any watch category (backend-on-demand)
    const { watch: category } = await this.categoryManager.getTickerCategory(tvTicker);
    if (category) {
      return { state: FeedState.WATCHED, color: 'yellow' };
    }

    if (this.recentManager.isRecent(tvTicker, Constants.RECENT_CUTOFF_MS)) {
      return { state: FeedState.RECENT, color: 'lime' };
    }

    return { state: FeedState.MAPPED, color: 'white' };
  }

  public async createAlertFeedEvent(tvTicker: string): Promise<void> {
    const alertTicker = await this.alertTickerManager.getAlertTicker(tvTicker);
    const investingTicker = alertTicker?.symbol;
    if (!investingTicker) {
      throw new Error(`Failed to convert ticker: ${tvTicker}`);
    }
    const feedInfo = await this.getAlertFeedState(investingTicker);
    const event = new AlertFeedEvent(investingTicker, feedInfo);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }

  public async createResetFeedEvent(): Promise<void> {
    // Special values to Paint all tickers during Reset
    const event = new AlertFeedEvent(Constants.MISC.RESET_FEED, { state: FeedState.UNMAPPED, color: 'red' });
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }
}
