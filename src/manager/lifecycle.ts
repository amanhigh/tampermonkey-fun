import { ITickerClient } from '../client/ticker';
import { IPriceAlertClient } from '../client/price_alert';
import { IInvestingClient } from '../client/investing';
import { CreateTickerRequest, Ticker } from '../models/ticker';
import { Alert } from '../models/alert';
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
   * Stop tracking a primary ticker: deletes remote Investing.com price alerts,
   * backend price-alert records, linked alert ticker identities, and finally
   * the primary ticker record. Fails if any remote alert cannot be deleted,
   * leaving the ticker fully tracked.
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
 *
 * Stop-tracking cleanup order:
 * 1. Fetch linked alert tickers
 * 2. Fetch backend price alerts for the ticker
 * 3. Validate no pending alerts exist — abort if any alert_id is blank
 * 4. Delete each remote Investing.com price alert (fail-fast)
 * 5. Delete each backend price-alert record (fail-fast)
 * 6. Delete linked alert ticker records via AlertTickerManager
 * 7. Delete primary ticker via tickerClient
 * 8. Publish TICKER_TRACKING_STOPPED
 */
export class LifecycleManager implements ILifecycleManager {
  constructor(
    private readonly tickerClient: ITickerClient,
    private readonly categoryManager: ICategoryManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly publisher: IPublisher,
    private readonly priceAlertClient: IPriceAlertClient,
    private readonly investingClient: IInvestingClient
  ) {}

  /** @inheritdoc */
  async startTracking(data: StartTrackingRequest): Promise<Ticker> {
    this.categoryManager.evictTicker(data.ticker);
    const ticker = await this.tickerClient.createTicker(data);

    // Publish domain event so WatchListHandler repaints the ticker
    await this.publisher.publish({
      type: DomainEventType.TICKER_TRACKING_STARTED,
      ticker: data.ticker,
    });

    return ticker;
  }

  /** @inheritdoc */
  async stopTracking(ticker: string): Promise<void> {
    this.categoryManager.evictTicker(ticker);

    // 1. Capture linked alert tickers before cascade delete
    const alertTickers = await this.alertTickerManager.getAlertTickersForTicker(ticker);

    // 2. Fetch backend price alerts for this ticker
    const priceAlerts = await this.priceAlertClient.listPriceAlerts({ ticker });

    // 3. Validate no pending alerts exist (alerts without alert_id)
    const pendingAlerts = priceAlerts.filter((a) => !a.alert_id);
    if (pendingAlerts.length > 0) {
      throw new Error(
        `Cannot stop tracking ${ticker}: ${pendingAlerts.length} pending alert(s) must be resolved first. Delete or refresh pending alerts before stopping tracking.`
      );
    }

    // 4. Delete each remote Investing.com price alert (fail-fast)
    for (const alert of priceAlerts) {
      await this.investingClient.deleteAlert(new Alert(alert.alert_id!, '', 0));
    }

    // 5. Delete each backend price-alert record (fail-fast)
    for (const alert of priceAlerts) {
      await this.priceAlertClient.deletePriceAlert(alert.alert_id!);
    }

    // 6. Explicitly delete linked alert ticker records before ticker cascade
    for (const at of alertTickers) {
      await this.alertTickerManager.deleteAlertTicker(at.symbol, ticker);
    }

    // 7. Delete primary ticker
    await this.tickerClient.deleteTicker(ticker);

    // 8. Publish TICKER_TRACKING_STOPPED for UI refresh
    await this.publisher.publish({
      type: DomainEventType.TICKER_TRACKING_STOPPED,
      ticker,
    });
  }
}
