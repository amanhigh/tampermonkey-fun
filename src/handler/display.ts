import { IDomManager } from '../manager/dom';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { AlertTicker } from '../models/alert_ticker';
import { IAlertBar } from './alert_bar';
import { IDomainEventConsumer, ISubscriber } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event';
import { ApiError } from '../models/api_error';

/**
 * Interface for display area operations.
 * Owns the compact/expanded display card that shows ticker status
 * and linked alert ticker information. Timeframes are shown in the
 * dedicated timeframe bar below this card.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IDisplayHandler extends IDomainEventConsumer {}

/**
 * Handles display area rendering.
 * Fetches alert-ticker data and delegates presentation to AlertBar.
 */
export class DisplayHandler implements IDisplayHandler {
  constructor(
    private readonly domManager: IDomManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly alertBar: IAlertBar
  ) {}

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    subscriber.subscribeMany(
      [
        DomainEventType.TICKER_CHANGED,
        DomainEventType.TICKER_TRACKING_STOPPED,
        DomainEventType.ALERT_TICKER_LINKED,
        DomainEventType.ALERT_TICKER_DELETED,
      ],
      async () => {
        await this.display();
      }
    );
  }

  /**
   * Fetches current ticker data and renders the display card.
   * Always starts in compact mode on fresh data fetch.
   * Consumers drive re-renders via TICKER_CHANGED, TICKER_TRACKING_STOPPED,
   * ALERT_TICKER_LINKED, and ALERT_TICKER_DELETED events.
   */
  async display(): Promise<void> {
    const tvTicker = this.domManager.getTicker();

    let alertTickers: AlertTicker[] = [];
    let isUntracked = false;
    try {
      alertTickers = await this.alertTickerManager.getAlertTickersForTicker(tvTicker);
    } catch (error) {
      // Backend 404 "Ticker not found" — expected for untracked tickers
      // Treat as empty alert-ticker list with untracked flag
      if (ApiError.isNotFoundError(error)) {
        isUntracked = true;
      } else {
        throw error;
      }
    }

    this.alertBar.render({ tvTicker, alertTickers, isUntracked });
  }
}
