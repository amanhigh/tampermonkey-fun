import { IInvestingClient } from '../client/investing';
import { Alert, PairInfo } from '../models/alert';
import { IAlertRepo } from '../repo/alert';
import { AlertClicked, AlertClickAction } from '../models/events';
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
  getAlerts(): Alert[] | null;

  /**
   * Get all alerts for Investing.com ticker
   * @param investingTicker Investing.com ticker
   * @returns Array of alerts sorted by price, or null if no pair info found
   */
  getAlertsForInvestingTicker(investingTicker: string): Alert[] | null;

  /**
   * Create alert for current trading view ticker
   * @param price Alert price
   * @throws Error If pair info not found for current ticker
   */
  createAlertForCurrentTicker(price: number): Promise<PairInfo>;

  /**
   * Delete all alerts for current ticker
   */
  deleteAllAlerts(): Promise<void>;

  /**
   * Delete alerts near target price for current ticker
   * @param targetPrice Price to delete alerts around
   */
  deleteAlertsByPrice(targetPrice: number): Promise<void>;

  /**
   * Delete specified alert
   * @param alert Alert to delete
   * @throws Error if deletion fails
   */
  deleteAlert(alert: Alert): Promise<void>;

  /**
   * Reloads alerts from Investing.com
   * @returns Promise resolving to number of alerts loaded
   */
  reloadAlerts(): Promise<number>;

  /**
   * Retrieve alerts belonging to the given pairId from local repository
   * @param pairId Pair identifier
   * @returns Array of alerts or null when none exist
   */
  getAlertsByPairId(pairId: string): Alert[] | null;

  /**
   * Delete all alerts belonging to a specific pairId from local repository
   * @param pairId Pair identifier
   */
  deleteAlertsByPairId(pairId: string): void;

  /**
   * Creates alert click event for ticker operations
   * @param tvTicker TradingView ticker or null for mapping
   * @param investingTicker Investing ticker or null for direct open
   * @returns Promise resolving when event is created
   */
  createAlertClickEvent(tvTicker: string | null, investingTicker: string | null): Promise<void>;
}

/**
 * Manages alert operations for trading
 */
export class AlertManager implements IAlertManager {
  constructor(
    private readonly alertRepo: IAlertRepo,
    private readonly pairManager: IPairManager,
    private readonly tickerManager: ITickerManager,
    private readonly investingClient: IInvestingClient,
    private readonly tradingViewManager: ITradingViewManager
  ) {}

  /** @inheritdoc */
  getAlerts(): Alert[] | null {
    const investingTicker = this.tickerManager.getInvestingTicker();
    return this.getAlertsForInvestingTicker(investingTicker);
  }

  /** @inheritdoc */
  getAlertsByPairId(pairId: string): Alert[] | null {
    const alerts = this.alertRepo.get(pairId);
    return alerts ?? null;
  }

  /** @inheritdoc */
  deleteAlertsByPairId(pairId: string): void {
    this.alertRepo.delete(pairId);
  }

  /**
   * Create alert via Investing.com and store in local repo if successful
   * @param investingTicker Investing.com ticker
   * @param price Alert price
   * @private
   */
  private async createAlert(investingTicker: string, price: number): Promise<PairInfo> {
    const pairInfo = this.pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      throw new Error(`No pair info found for ticker: ${investingTicker}`);
    }

    try {
      const ltp = this.tradingViewManager.getLastTradedPrice();
      const response = await this.investingClient.createAlert(pairInfo.name, pairInfo.pairId, price, ltp);
      const alert = new Alert('', response.pairId, response.price);
      this.alertRepo.addAlert(pairInfo.pairId, alert);
      return pairInfo;
    } catch {
      throw new Error(`Failed to create alert for ${investingTicker} at price ${price}`);
    }
  }

  /**
   * Load alerts from HTML content into repository
   * @param html HTML content containing alert items
   * @returns Number of alerts loaded
   * @private
   */
  private reloadFromHtml(html: string): number {
    let count = 0;

    $(html)
      .find('.js-alert-item[data-trigger=price]')
      .each((_, alertElement) => {
        const $alt = $(alertElement);
        const pairId = $alt.attr('data-pair-id') || '';
        const price = parseFloat($alt.attr('data-value') || '0');
        const id = $alt.attr('data-alert-id') || '';
        const name = $alt.attr('data-name') || '';

        const alert = new Alert(id, pairId, price, name);

        if (pairId && !isNaN(price) && id && price > 0) {
          this.alertRepo.addAlert(pairId, alert);
          count++;
        } else {
          const fallbackName = this.pairManager.investingTickerToPairInfo(pairId)?.name;
          console.warn('Invalid alert:', fallbackName, alert);
        }
      });

    return count;
  }

  /** @inheritdoc */
  async createAlertForCurrentTicker(price: number): Promise<PairInfo> {
    const investingTicker = this.tickerManager.getInvestingTicker();
    return this.createAlert(investingTicker, price);
  }

  /** @inheritdoc */
  async deleteAllAlerts(): Promise<void> {
    const pairInfo = this.getCurrentPairInfo();
    const alerts = this.alertRepo.getSortedAlerts(pairInfo.pairId);
    if (!alerts) {
      Notifier.warn('No alerts (Pair) found to delete');
      return;
    }
    await Promise.all(alerts.map(async (alert) => this.deleteAlert(alert)));
  }

  /** @inheritdoc */
  async deleteAlertsByPrice(targetPrice: number): Promise<void> {
    const pairInfo = this.getCurrentPairInfo();
    const tolerance = targetPrice * 0.03;
    const alerts = this.alertRepo.getSortedAlerts(pairInfo.pairId);
    if (!alerts) {
      Notifier.warn('No alerts (Pair) found to delete');
      return;
    }

    const filteredAlerts = alerts.filter((alert) => Math.abs(alert.price - targetPrice) <= tolerance);
    if (filteredAlerts.length === 0) {
      Notifier.warn('No alerts found within price tolerance');
      return;
    }

    await Promise.all(filteredAlerts.map(async (alert) => this.deleteAlert(alert)));
  }

  /** @inheritdoc */
  async deleteAlert(alert: Alert): Promise<void> {
    try {
      await this.investingClient.deleteAlert(alert);
      this.alertRepo.removeAlert(alert.pairId, alert.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete alert ${alert.id}: ${message}`);
    }
  }

  /** @inheritdoc */
  async reloadAlerts(): Promise<number> {
    this.alertRepo.clear();
    const html = await this.investingClient.getAllAlerts();
    const count = this.reloadFromHtml(html);

    return count;
  }

  /** @inheritdoc */
  public getAlertsForInvestingTicker(investingTicker: string): Alert[] | null {
    const pairInfo = this.pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      return null;
    }
    return this.alertRepo.getSortedAlerts(pairInfo.pairId);
  }

  /** @inheritdoc */
  public async createAlertClickEvent(investingTicker: string, action: AlertClickAction): Promise<void> {
    const event = new AlertClicked(investingTicker, action);
    await this.alertRepo.createAlertClickEvent(event);
  }

  /**
   * Get pair info for current ticker
   * @private
   * @returns PairInfo or null if not found
   */
  private getCurrentPairInfo(): PairInfo {
    const investingTicker = this.tickerManager.getInvestingTicker();
    const pairInfo = this.pairManager.investingTickerToPairInfo(investingTicker);
    if (!pairInfo) {
      throw new Error(`No Pair Info found for ${investingTicker}`);
    }
    return pairInfo;
  }
}
