import { AlertFeedEvent } from '../models/barkat/alert/alertfeed';
import { Constants } from '../models/shared/constant';
import { WatchCategoryId } from '../models/barkat/market/watch';
import { IAlertTickerManager } from './alert_ticker';
import { ICategoryManager } from './category';
import { IDisplayManager } from './display';

/**
 * Interface for managing alert feed state.
 *
 * All methods use primitive identifiers rather than full AlertTicker records
 * because the feed event travels through Greasemonkey GM.setValue (cross-context
 * serialisation) and the manager only needs the Investing symbol and TV ticker.
 *
 * A null ticker means the symbol is unmapped — the state will be UNMAPPED (purple).
 */
export interface IAlertFeedManager {
  /**
   * Create an alert feed event for an Investing symbol.
   * When ticker is omitted or undefined the feed row is treated as unmapped (purple).
   * @param alertTicker - The Investing.com symbol for the feed row
   * @param ticker - The TV ticker for category/recent lookups; omit for unmapped rows
   * @returns Promise that resolves when event is written to GM storage
   */
  createAlertFeedEvent(alertTicker: string, ticker?: string): Promise<void>;

  /**
   * Resolve all alert tickers linked to a TV ticker and create alert feed events for each.
   * Composite tickers and unmapped tickers are skipped silently.
   * @param ticker - The TV ticker whose linked alert feed rows should be repainted
   * @returns Promise that resolves when all linked events are written
   */
  createAlertFeedEventsForTicker(ticker: string): Promise<void>;

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
    private readonly displayManager: IDisplayManager,
    private readonly categoryManager: ICategoryManager,
    private readonly alertTickerManager: IAlertTickerManager
  ) {}

  /** @inheritdoc */
  public async createAlertFeedEvent(alertTicker: string, ticker?: string): Promise<void> {
    const feedInfo = await this.displayManager.resolve(ticker ?? null);
    const event = new AlertFeedEvent(alertTicker, feedInfo);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }

  /** @inheritdoc */
  public async createAlertFeedEventsForTicker(ticker: string): Promise<void> {
    // Composite TradingView formulas (e.g. SENSEX/USDINR/XAUUSD)
    // never have Investing alert ticker mappings — skip silently.
    const category = await this.categoryManager.getTickerCategory(ticker);
    if (category.watch?.id === WatchCategoryId.COMPOSITE) {
      return;
    }

    const alertTickers = await this.alertTickerManager.getAlertTickersForTicker(ticker);
    for (const alertTicker of alertTickers) {
      await this.createAlertFeedEvent(alertTicker.symbol, alertTicker.ticker);
    }
  }

  /** @inheritdoc */
  public async createResetFeedEvent(): Promise<void> {
    const feedInfo = await this.displayManager.resolve(null);
    const event = new AlertFeedEvent(Constants.MISC.RESET_FEED, feedInfo);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_FEED_UPDATE, event.stringify());
  }
}
