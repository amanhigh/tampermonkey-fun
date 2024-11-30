import { IInvestingClient } from '../client/investing';
import { Alert, PairInfo } from '../models/alert';
import { IAlertRepo } from '../repo/alert';
import { Notifier } from '../util/notify';
import { IPairManager } from './pair';
import { ITickerManager } from './ticker';
import { ITradingViewManager } from './tv';

/**
 * Interface for managing alert operations
 */
export interface IAlertManager {
  /**
   * Get all alerts for current trading view ticker
   * @returns Array of alerts sorted by price
   */
  getAlerts(): Alert[];

  /**
   * Create alert for current trading view ticker
   * @param price Alert price
   * @throws Error If pair info not found for current ticker
   */
  createAlertForCurrentTicker(price: number): Promise<void>;

  /**
   * Delete all alerts for current ticker
   */
  deleteAllAlerts(): Promise<void>;

  /**
   * Delete alerts near target price for current ticker
   * @param targetPrice Price to delete alerts around
   */
  deleteAlertsByPrice(targetPrice: number): Promise<void>;
}

/**
 * Manages alert operations for trading
 */
export class AlertManager implements IAlertManager {
  constructor(
    private readonly _alertRepo: IAlertRepo,
    private readonly _pairManager: IPairManager,
    private readonly _tickerManager: ITickerManager,
    private readonly _investingClient: IInvestingClient,
    private readonly _tradingViewManager: ITradingViewManager
  ) {}

  /** @inheritdoc */
  getAlerts(): Alert[] {
    const investingTicker = this._tickerManager.getInvestingTicker();
    return this._getAlertsForInvestingTicker(investingTicker);
  }

  /**
   * Create alert via Investing.com and store in local repo if successful
   * @param investingTicker Investing.com ticker
   * @param price Alert price
   * @private
   */
  private async _createAlert(investingTicker: string, price: number): Promise<void> {
    const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      Notifier.error(`No pair info found for ticker: ${investingTicker}`);
      return;
    }

    const ltp = this._tradingViewManager.getLastTradedPrice();
    try {
      const response = await this._investingClient.createAlert(pairInfo.name, pairInfo.pairId, price, ltp);
      const alert = new Alert('', response.pairId, response.price);
      this._alertRepo.addAlert(pairInfo.pairId, alert);
    } catch {
      Notifier.error(`Failed to create alert for ${investingTicker} at price ${price}`);
    }
  }

  /**
   * Delete a single alert both from Investing.com and local repo
   * @param alert Alert to delete
   * @param pairId Associated pair ID
   * @returns true if deletion successful, false otherwise
   * @private
   */
  private async _deleteAlert(alert: Alert, pairId: string): Promise<boolean> {
    try {
      await this._investingClient.deleteAlert(alert);
      this._alertRepo.removeAlert(pairId, alert.id);
      return true;
    } catch {
      Notifier.error(`Failed to delete alert ${alert.id}`);
      return false;
    }
  }

  async createAlertForCurrentTicker(price: number): Promise<void> {
    const investingTicker = this._tickerManager.getInvestingTicker();
    await this._createAlert(investingTicker, price);
  }

  async deleteAllAlerts(): Promise<void> {
    const pairInfo = this._getCurrentPairInfo();
    if (!pairInfo) {
      Notifier.error('Could not get pair info for current ticker');
      return;
    }

    const alerts = this.getAlerts();
    await Promise.all(alerts.map(async (alert) => this._deleteAlert(alert, pairInfo.pairId)));
  }

  async deleteAlertsByPrice(targetPrice: number): Promise<void> {
    const pairInfo = this._getCurrentPairInfo();
    if (!pairInfo) {
      Notifier.error('Could not get pair info for current ticker');
      return;
    }

    const tolerance = targetPrice * 0.03;
    const alerts = this.getAlerts().filter((alert) => Math.abs(alert.price - targetPrice) <= tolerance);

    await Promise.all(alerts.map(async (alert) => this._deleteAlert(alert, pairInfo.pairId)));
  }

  /**
   * Get alerts for an investing ticker
   * @private
   * @param investingTicker Investing.com ticker
   * @returns Array of alerts sorted by price
   */
  private _getAlertsForInvestingTicker(investingTicker: string): Alert[] {
    const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      return [];
    }
    return this._alertRepo.getSortedAlerts(pairInfo.pairId);
  }

  /**
   * Get pair info for current ticker
   * @private
   * @returns PairInfo or null if not found
   */
  private _getCurrentPairInfo(): PairInfo | null {
    const investingTicker = this._tickerManager.getInvestingTicker();
    return this._pairManager.investingTickerToPairInfo(investingTicker);
  }
}
