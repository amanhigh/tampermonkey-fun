import { AlertFeedEvent } from '../models/alertfeed';
import { DisplayState } from '../models/display';
import { Constants } from '../models/constant';
import { IDisplayManager } from './display';

/**
 * Interface for managing alert feed state.
 *
 * All methods use primitive identifiers rather than full AlertTicker records
 * because the feed event travels through Greasemonkey GM.setValue (cross-context
 * serialisation) and the manager only needs the Investing symbol and TV ticker.
 *
 * A null ticker means the symbol is unmapped — the state will be UNMAPPED (firebrick).
 */
export interface IAlertFeedManager {
  /**
   * Create an alert feed event for an Investing symbol.
   * When ticker is omitted or undefined the feed row is treated as unmapped (firebrick).
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
  constructor(private readonly displayManager: IDisplayManager) {}

  /** @inheritdoc */
  public async createAlertFeedEvent(alertTicker: string, ticker?: string): Promise<void> {
    const feedInfo = await this.displayManager.resolve(ticker ?? null);
    const event = new AlertFeedEvent(alertTicker, feedInfo);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }

  /** @inheritdoc */
  public async createResetFeedEvent(): Promise<void> {
    // Special values to Paint all tickers during Reset
    const event = new AlertFeedEvent(Constants.MISC.RESET_FEED, {
      state: DisplayState.UNMAPPED,
      color: 'firebrick',
    });
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }
}
