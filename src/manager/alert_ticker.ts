import { IAlertTickerClient } from '../client/alert_ticker';
import { AlertTicker, AlertTickerType, CreateAlertTickerRequest } from '../models/alert_ticker';
import { IPublisher } from './event_bus';
import { DomainEventType } from '../models/domain_event';

/**
 * Interface for managing Alert Ticker (Investing.com identity) operations.
 *
 * Domain methods:
 * - linkAlertTicker → attach an Investing ticker under a TV ticker
 * - getPrimaryAlertTicker → get the PRIMARY Alert ticker for a TV ticker
 * - getAlertTickers → list all Alert tickers (audit/global flows)
 * - fetchAlertTicker → look up an Alert ticker by its symbol
 */
export interface IAlertTickerManager {
  /**
   * Attach an Alert (Investing) ticker under a primary TV ticker.
   * Type is auto-selected: SECONDARY if a PRIMARY already exists, otherwise PRIMARY.
   * @param ticker - Parent primary ticker identity
   * @param data - Alert ticker creation payload (without type)
   * @returns Promise resolving with created Alert ticker record
   */
  linkAlertTicker(ticker: string, data: Omit<CreateAlertTickerRequest, 'type'>): Promise<AlertTicker>;

  /**
   * Get the PRIMARY Alert ticker for a given TV ticker, or null if none exists.
   * @param ticker - Primary ticker identity
   * @returns Promise resolving with the PRIMARY Alert ticker, or null
   */
  getPrimaryAlertTicker(ticker: string): Promise<AlertTicker | null>;

  /**
   * Fetch an Alert ticker by its Investing.com symbol.
   * @param investingTicker - Alert/Investing ticker symbol
   * @returns Promise resolving with the Alert ticker record, or null if not found
   */
  fetchAlertTicker(investingTicker: string): Promise<AlertTicker | null>;

  /**
   * List all Alert tickers (auto-paginated). Used for audit coverage and global flows.
   * @returns Promise resolving with all Alert ticker records
   */
  getAlertTickers(): Promise<AlertTicker[]>;

  /**
   * Get all linked alert tickers for a specific TV ticker.
   * @param ticker - TV ticker to lookup linked alert tickers for
   * @returns Promise resolving with array of linked Alert tickers (empty if none)
   */
  getAlertTickersForTicker(ticker: string): Promise<AlertTicker[]>;

  /**
   * Delete an Alert ticker by its Investing.com symbol.
   * @param alertTicker - Alert ticker symbol to delete
   */
  deleteAlertTicker(alertTicker: string): Promise<void>;
}

/**
 * Manages Alert Ticker (Investing.com identity) operations against the Kohan backend.
 */
export class AlertTickerManager implements IAlertTickerManager {
  constructor(
    private readonly alertTickerClient: IAlertTickerClient,
    private readonly publisher: IPublisher
  ) {}

  /** @inheritdoc */
  async linkAlertTicker(ticker: string, data: Omit<CreateAlertTickerRequest, 'type'>): Promise<AlertTicker> {
    const primary = await this.getPrimaryAlertTicker(ticker);
    const type: AlertTickerType = primary ? 'SECONDARY' : 'PRIMARY';
    const alertTicker = await this.alertTickerClient.createAlertTicker(ticker, { ...data, type });

    // Publish domain event so consumers (alert feed, etc.) react
    await this.publisher.publish({
      type: DomainEventType.ALERT_TICKER_LINKED,
      ticker,
      alertTicker: alertTicker.symbol,
    });

    return alertTicker;
  }

  /** @inheritdoc */
  async getPrimaryAlertTicker(ticker: string): Promise<AlertTicker | null> {
    const tickers = await this.alertTickerClient.listAlertTickers({ ticker, type: 'PRIMARY' });
    return tickers[0] ?? null;
  }

  /** @inheritdoc */
  async fetchAlertTicker(investingTicker: string): Promise<AlertTicker | null> {
    try {
      return await this.alertTickerClient.getAlertTicker(investingTicker);
    } catch {
      return null;
    }
  }

  /** @inheritdoc */
  async getAlertTickers(): Promise<AlertTicker[]> {
    return this.alertTickerClient.listAlertTickers({});
  }

  /** @inheritdoc */
  async getAlertTickersForTicker(ticker: string): Promise<AlertTicker[]> {
    return this.alertTickerClient.listAlertTickers({ ticker });
  }

  /** @inheritdoc */
  async deleteAlertTicker(alertTicker: string): Promise<void> {
    await this.alertTickerClient.deleteAlertTicker(alertTicker);

    // Publish deletion event so alert-feed subscribers repaint UNMAPPED
    await this.publisher.publish({
      type: DomainEventType.ALERT_TICKER_DELETED,
      alertTicker,
    });
  }
}
