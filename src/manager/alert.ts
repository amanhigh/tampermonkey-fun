import { Alert, PairInfo } from '../models/alert';
import { IAlertRepo } from '../repo/alert';
import { IPairManager } from './pair';
import { ITickerManager } from './ticker';

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
  createAlertForCurrentTicker(price: number): void;

  /**
   * Delete all alerts for current ticker
   */
  deleteAllAlerts(): void;

  /**
   * Delete alerts near target price for current ticker
   * @param targetPrice Price to delete alerts around
   */
  deleteAlertsByPrice(targetPrice: number): void;
}

/**
 * Manages alert operations for trading
 */
export class AlertManager implements IAlertManager {
  /**
   * @param alertRepo Repository for alert operations
   * @param pairManager For pair info lookups
   * @param tickerManager For ticker operations
   */
  constructor(
    private readonly _alertRepo: IAlertRepo,
    private readonly _pairManager: IPairManager,
    private readonly _tickerManager: ITickerManager
  ) {}

  /** @inheritdoc */
  getAlerts(): Alert[] {
    const investingTicker = this._tickerManager.getInvestingTicker();
    return this._getAlertsForInvestingTicker(investingTicker);
  }

  /**
   * Create alert for given investing ticker and price
   * @param investingTicker Investing.com ticker
   * @param price Alert price
   * @throws Error If pair info not found for ticker
   * @private
   */
  private _createAlert(investingTicker: string, price: number): void {
    const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      throw new Error(`No pair info found for ticker: ${investingTicker}`);
    }
    const alert = new Alert(pairInfo.pairId, price);
    this._alertRepo.addAlert(pairInfo.pairId, alert);
  }

  /** @inheritdoc */
  createAlertForCurrentTicker(price: number): void {
    const investingTicker = this._tickerManager.getInvestingTicker();
    this._createAlert(investingTicker, price);
  }

  /** @inheritdoc */
  deleteAllAlerts(): void {
    // TODO: Handler Refresh Alerts on Delete
    const pairInfo = this._getCurrentPairInfo();
    const alerts = this.getAlerts();
    alerts.forEach((alert) => {
      this._alertRepo.removeAlert(pairInfo.pairId, alert.id);
    });
  }

  /** @inheritdoc */
  deleteAlertsByPrice(targetPrice: number): void {
    const pairInfo = this._getCurrentPairInfo();
    const tolerance = targetPrice * 0.03;
    const alerts = this.getAlerts();
    alerts.forEach((alert) => {
      if (Math.abs(alert.price - targetPrice) <= tolerance) {
        this._alertRepo.removeAlert(pairInfo.pairId, alert.id);
      }
    });
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
   * @throws Error If pair info not found
   * @returns Pair information
   */
  private _getCurrentPairInfo(): PairInfo {
    const investingTicker = this._tickerManager.getInvestingTicker();
    const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      throw new Error(`No pair info found for ticker: ${investingTicker}`);
    }
    return pairInfo;
  }
}
