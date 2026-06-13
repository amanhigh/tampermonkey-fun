import { AlertFeedEvent, FeedInfo, FeedState } from '../models/alertfeed';
import { Constants } from '../models/constant';
import { ICategoryManager } from './category';
import { IRecentManager } from './recent';
import { AlertTicker } from '../models/alert_ticker';

/**
 * Interface for managing alert feed state
 */
export interface IAlertFeedManager {
  /**
   * Compute feed state from an already-resolved AlertTicker record,
   * or return UNMAPPED when null is passed (no match found).
   * Used during repaint and event creation.
   * @param alertTicker - The resolved AlertTicker record, or null if unmapped
   * @returns Promise resolving to FeedInfo containing state and color
   */
  getAlertFeedState(alertTicker: AlertTicker | null): Promise<FeedInfo>;

  /**
   * Create an alert feed event for a resolved alert ticker record.
   * Caller must resolve and guard for null before calling.
   * @param alertTicker - The resolved AlertTicker record
   * @returns Promise that resolves when event is created
   */
  createAlertFeedEvent(alertTicker: AlertTicker): Promise<void>;

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
    private readonly categoryManager: ICategoryManager,
    private readonly recentManager: IRecentManager
  ) {}

  /** @inheritdoc */
  public async getAlertFeedState(alertTicker: AlertTicker | null): Promise<FeedInfo> {
    if (!alertTicker) {
      return { state: FeedState.UNMAPPED, color: 'red' };
    }
    const tvTicker = alertTicker.ticker;

    // Check if ticker belongs to any watch category (backend-on-demand)
    const { watch: category } = await this.categoryManager.getTickerCategory(tvTicker);
    if (category) {
      return { state: FeedState.WATCHED, color: 'yellow' };
    }

    if (await this.recentManager.isRecent(tvTicker, Constants.RECENT_CUTOFF_MS)) {
      return { state: FeedState.RECENT, color: 'lime' };
    }

    return { state: FeedState.MAPPED, color: 'white' };
  }

  public async createAlertFeedEvent(alertTicker: AlertTicker): Promise<void> {
    const feedInfo = await this.getAlertFeedState(alertTicker);
    const event = new AlertFeedEvent(alertTicker.symbol, feedInfo);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }

  public async createResetFeedEvent(): Promise<void> {
    // Special values to Paint all tickers during Reset
    const event = new AlertFeedEvent(Constants.MISC.RESET_FEED, { state: FeedState.UNMAPPED, color: 'red' });
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }
}
