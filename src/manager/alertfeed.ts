import { AlertFeedEvent, FeedInfo, FeedState } from '../models/alertfeed';
import { Constants } from '../models/constant';
import { IRecentManager } from './recent';
import { ITradingViewWatchlistManager } from './watchlist';

/**
 * Interface for managing alert feed state.
 *
 * All methods use primitive identifiers rather than full AlertTicker records
 * because the feed event travels through Greasemonkey GM.setValue (cross-context
 * serialisation) and the manager only needs the Investing symbol and TV ticker.
 *
 * A null ticker means the symbol is unmapped — the state will be UNMAPPED (red).
 */
export interface IAlertFeedManager {
  /**
   * Compute feed state from a TV ticker string (or null for unmapped).
   * @param ticker - The TV ticker to look up category/recent state, or null if unmapped
   * @returns Promise resolving to FeedInfo containing state and color
   */
  getAlertFeedState(ticker: string | null): Promise<FeedInfo>;

  /**
   * Create an alert feed event for an Investing symbol.
   * When ticker is omitted or undefined the feed row is treated as unmapped (red).
   * @param alertTicker - The Investing.com symbol for the feed row
   * @param ticker - The TV ticker for category/recent lookups; omit for unmapped rows
   * @returns Promise that resolves when event is written to GM storage
   */
  createAlertFeedEvent(alertTicker: string, ticker?: string): Promise<void>;

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
    private readonly recentManager: IRecentManager,
    private readonly watchlistManager: ITradingViewWatchlistManager
  ) {}

  /** @inheritdoc */
  public async getAlertFeedState(ticker: string | null): Promise<FeedInfo> {
    if (!ticker) {
      return { state: FeedState.UNMAPPED, color: 'red' };
    }

    // Check if ticker exists in current TradingView watchlist DOM snapshot
    const watchlistTickers = await this.watchlistManager.getWatchlistTickers();
    if (watchlistTickers.has(ticker)) {
      return { state: FeedState.WATCHED, color: 'yellow' };
    }

    if (await this.recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS)) {
      return { state: FeedState.RECENT, color: 'lime' };
    }

    return { state: FeedState.MAPPED, color: 'white' };
  }

  /** @inheritdoc */
  public async createAlertFeedEvent(alertTicker: string, ticker?: string): Promise<void> {
    const feedInfo = await this.getAlertFeedState(ticker ?? null);
    const event = new AlertFeedEvent(alertTicker, feedInfo);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }

  /** @inheritdoc */
  public async createResetFeedEvent(): Promise<void> {
    // Special values to Paint all tickers during Reset
    const event = new AlertFeedEvent(Constants.MISC.RESET_FEED, { state: FeedState.UNMAPPED, color: 'red' });
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }
}
