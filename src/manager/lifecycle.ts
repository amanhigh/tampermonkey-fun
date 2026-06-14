import { ITickerClient } from '../client/ticker';
import { CreateTickerRequest, Ticker } from '../models/ticker';
import { IPaintManager } from './paint';
import { ICategoryManager } from './category';
import { IAlertTickerManager } from './alert_ticker';
import { IPublisher } from './event_bus';
import { DomainEventType } from '../models/domain_event';

/**
 * Request type for starting to track a new primary ticker.
 * Alias for the backend create-ticker request.
 */
export type StartTrackingRequest = CreateTickerRequest;

/**
 * Interface for managing ticker lifecycle operations — create, delete,
 * and the cache-invalidation + paint orchestration that wraps them.
 */
export interface ILifecycleManager {
  /**
   * Start tracking a new primary ticker: evicts stale cache, creates the
   * backend record, and schedules a repaint so the new category shows
   * immediately.
   * @param data - Ticker creation payload
   * @returns Promise resolving with created ticker record
   */
  startTracking(data: StartTrackingRequest): Promise<Ticker>;

  /**
   * Stop tracking a primary ticker: evicts stale cache, deletes the
   * backend record, and schedules a repaint.
   * @param ticker - Ticker symbol to stop tracking
   */
  stopTracking(ticker: string): Promise<void>;
}

/**
 * Orchestrates ticker lifecycle operations.
 *
 * Ensures the category cache is invalidated and the UI repainted
 * whenever a ticker is created or deleted, without introducing
 * circular dependencies between TickerManager ↔ PaintManager.
 */
export class LifecycleManager implements ILifecycleManager {
  constructor(
    private readonly tickerClient: ITickerClient,
    private readonly categoryManager: ICategoryManager,
    private readonly paintManager: IPaintManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly publisher: IPublisher
  ) {}

  /** @inheritdoc */
  async startTracking(data: StartTrackingRequest): Promise<Ticker> {
    this.categoryManager.evictTicker(data.ticker);
    const ticker = await this.tickerClient.createTicker(data);
    void this.paintManager.paintTickers([data.ticker]);

    // Publish domain event for alert-feed consumers
    await this.publisher.publish({
      type: DomainEventType.TICKER_TRACKING_STARTED,
      ticker: data.ticker,
    });

    return ticker;
  }

  /** @inheritdoc */
  async stopTracking(ticker: string): Promise<void> {
    this.categoryManager.evictTicker(ticker);

    // Capture linked alert tickers before backend delete cascades them
    const alertTickers = await this.alertTickerManager.getAlertTickersForTicker(ticker);

    // Publish ALERT_TICKER_DELETED for each linked alert ticker before cascade delete
    for (const at of alertTickers) {
      await this.publisher.publish({
        type: DomainEventType.ALERT_TICKER_DELETED,
        ticker,
        alertTicker: at.symbol,
      });
    }

    await this.tickerClient.deleteTicker(ticker);
    void this.paintManager.paintTickers([ticker]);

    // Keep TICKER_TRACKING_STOPPED for other consumers (alert-feed no longer reacts)
    await this.publisher.publish({
      type: DomainEventType.TICKER_TRACKING_STOPPED,
      ticker,
    });
  }
}
