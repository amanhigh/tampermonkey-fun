import { IAlertTickerClient } from '../client/alert_ticker';
import { AlertTicker, CreateAlertTickerRequest } from '../models/alert_ticker';

/**
 * Interface for managing Alert Ticker operations (Investing.com identity).
 * Minimal scope: only create and list-by-TV-ticker until call sites force more.
 */
export interface IAlertTickerManager {
  /**
   * Create an Alert Ticker under a primary TV ticker.
   * @param tvTicker - Parent primary ticker identity
   * @param data - Alert ticker creation payload
   * @returns Promise resolving with created Alert Ticker record
   */
  createAlertTicker(tvTicker: string, data: CreateAlertTickerRequest): Promise<AlertTicker>;

  /**
   * Get all Alert Tickers attached to a given TV ticker.
   * Uses backend list API filtered by ticker.
   * @param tvTicker - Primary ticker identity
   * @returns Promise resolving with array of Alert Ticker records (empty if none)
   */
  getAlertTickers(tvTicker: string): Promise<AlertTicker[]>;
}

/**
 * AlertTickerManager handles backend Alert Ticker operations.
 * Every TV ticker can have zero or more Alert Tickers attached.
 */
export class AlertTickerManager implements IAlertTickerManager {
  constructor(private readonly tickerAlertClient: IAlertTickerClient) {}

  /** @inheritdoc */
  async createAlertTicker(tvTicker: string, data: CreateAlertTickerRequest): Promise<AlertTicker> {
    return this.tickerAlertClient.createAlertTicker(tvTicker, data);
  }

  /** @inheritdoc */
  async getAlertTickers(tvTicker: string): Promise<AlertTicker[]> {
    return this.tickerAlertClient.listAlertTickers({ ticker: tvTicker });
  }
}
