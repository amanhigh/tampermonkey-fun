import { IAlertTickerClient } from '../client/alert_ticker';
import { AlertTicker, CreateAlertTickerRequest } from '../models/alert_ticker';

/**
 * Interface for managing Alert Ticker (Investing.com identity) operations.
 *
 * Domain methods:
 * - linkAlertTicker → attach an Investing ticker under a TV ticker
 * - getAlertTicker → get default Alert ticker for a TV ticker
 * - fetchAlertTicker → look up an Alert ticker by its symbol
 * - getAllAlertTickers → list all Alert tickers (audit/global flows)
 */
export interface IAlertTickerManager {
  /**
   * Attach an Alert (Investing) ticker under a primary TV ticker.
   * @param tvTicker - Parent primary ticker identity
   * @param data - Alert ticker creation payload
   * @returns Promise resolving with created Alert ticker record
   */
  linkAlertTicker(tvTicker: string, data: CreateAlertTickerRequest): Promise<AlertTicker>;

  /**
   * Get the default Alert ticker for a given TV ticker.
   * Returns the first Alert ticker from the backend list, or null if none.
   * @param tvTicker - Primary ticker identity
   * @returns Promise resolving with the first Alert ticker, or null
   */
  getAlertTicker(tvTicker: string): Promise<AlertTicker | null>;

  /**
   * Fetch an Alert ticker by its Investing.com symbol.
   * @param investingTicker - Alert/Investing ticker symbol
   * @returns Promise resolving with the Alert ticker record, or null if not found
   */
  fetchAlertTicker(investingTicker: string): Promise<AlertTicker | null>;

  /**
   * Get ALL Alert tickers (auto-paginated). Used for audit coverage and global flows.
   * @returns Promise resolving with all Alert ticker records
   */
  getAllAlertTickers(): Promise<AlertTicker[]>;
}

/**
 * Manages Alert Ticker (Investing.com identity) operations against the Kohan backend.
 */
export class AlertTickerManager implements IAlertTickerManager {
  constructor(private readonly alertTickerClient: IAlertTickerClient) {}

  /** @inheritdoc */
  async linkAlertTicker(tvTicker: string, data: CreateAlertTickerRequest): Promise<AlertTicker> {
    return this.alertTickerClient.createAlertTicker(tvTicker, data);
  }

  /** @inheritdoc */
  async getAlertTicker(tvTicker: string): Promise<AlertTicker | null> {
    const tickers = await this.alertTickerClient.listAlertTickers({ ticker: tvTicker });
    // FIXME: Better Default than first
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
  async getAllAlertTickers(): Promise<AlertTicker[]> {
    return this.alertTickerClient.listAlertTickers({});
  }
}
