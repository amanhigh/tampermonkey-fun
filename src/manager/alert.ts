import { IInvestingClient } from '../client/investing';
import { Alert, PairInfo } from '../models/alert';
import { AlertTicker } from '../models/alert_ticker';
import { IAlertRepo } from '../repo/alert';
import { AlertClicked, AlertClickAction } from '../models/events';
import { Notifier } from '../util/notify';
import { IAlertTickerManager } from './alert_ticker';
import { IDomManager } from './dom';
import { ITradingViewManager } from './tv';

/**
 * Interface for managing alert operations
 */
export interface IAlertManager {
  /**
   * Get all alerts for current trading view ticker
   * @returns Promise resolving to array of alerts sorted by price, or null if no alert ticker
   */
  getAlerts(): Promise<Alert[] | null>;

  /**
   * Get all alerts for Investing.com ticker
   * @param investingTicker Investing.com ticker
   * @returns Promise resolving to array of alerts sorted by price, or null if no pair info found
   */
  getAlertsForInvestingTicker(investingTicker: string): Promise<Alert[] | null>;

  /**
   * Create alert for current trading view ticker
   * @param price Alert price
   * @throws Error If no alert ticker found for current ticker
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
   */
  createAlertClickEvent(tvTicker: string | null, investingTicker: string | null): Promise<void>;
}

/**
 * Manages alert operations for trading using backend Alert Tickers for pair resolution.
 */
export class AlertManager implements IAlertManager {
  constructor(
    private readonly alertRepo: IAlertRepo,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly tickerManager: IDomManager,
    private readonly investingClient: IInvestingClient,
    private readonly tradingViewManager: ITradingViewManager
  ) {}

  /** @inheritdoc */
  async getAlerts(): Promise<Alert[] | null> {
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
   * Get the first Alert Ticker for the current TV ticker, or null if none.
   * @private
   */
  private async getFirstAlertTicker(): Promise<AlertTicker | null> {
    const tvTicker = this.tickerManager.getTicker();
    const tickers = await this.alertTickerManager.getAlertTickers(tvTicker);
    return tickers[0] ?? null;
  }

  /**
   * Create alert via Investing.com and store in local repo if successful
   */
  private async createAlert(price: number): Promise<PairInfo> {
    const tvTicker = this.tickerManager.getTicker();
    const tickers = await this.alertTickerManager.getAlertTickers(tvTicker);
    const alertTicker = tickers[0];
    if (!alertTicker) {
      throw new Error(`No alert ticker found for ${tvTicker}`);
    }

    const pairInfo = new PairInfo(
      alertTicker.name,
      alertTicker.pair_id,
      alertTicker.exchange ?? '',
      alertTicker.symbol
    );

    try {
      const ltp = this.tradingViewManager.getLastTradedPrice();
      const response = await this.investingClient.createAlert(pairInfo.name, pairInfo.pairId, price, ltp);
      const alert = new Alert('', response.pairId, response.price);
      this.alertRepo.addAlert(pairInfo.pairId, alert);
      return pairInfo;
    } catch {
      throw new Error(`Failed to create alert for ${alertTicker.symbol} at price ${price}`);
    }
  }

  /**
   * Load alerts from HTML content into repository
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
          console.warn('Invalid alert:', pairId, alert);
        }
      });

    return count;
  }

  /** @inheritdoc */
  async createAlertForCurrentTicker(price: number): Promise<PairInfo> {
    return this.createAlert(price);
  }

  /** @inheritdoc */
  async deleteAllAlerts(): Promise<void> {
    const pairInfo = await this.getCurrentPairInfo();
    const alerts = this.alertRepo.getSortedAlerts(pairInfo.pairId);
    if (!alerts) {
      Notifier.warn('No alerts (Pair) found to delete');
      return;
    }
    await Promise.all(alerts.map(async (alert) => this.deleteAlert(alert)));
  }

  /** @inheritdoc */
  async deleteAlertsByPrice(targetPrice: number): Promise<void> {
    const pairInfo = await this.getCurrentPairInfo();
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
  async getAlertsForInvestingTicker(investingTicker: string): Promise<Alert[] | null> {
    // For now get current TV ticker's alert tickers and match by symbol.
    // With the two-method manager we rely on the current-TV context.
    const tvTicker = this.tickerManager.getTicker();
    const tickers = await this.alertTickerManager.getAlertTickers(tvTicker);
    const alertTicker = tickers.find((t) => t.symbol === investingTicker) ?? tickers[0];
    if (!alertTicker) {
      return null;
    }
    return this.alertRepo.getSortedAlerts(alertTicker.pair_id);
  }

  /** @inheritdoc */
  async createAlertClickEvent(investingTicker: string, action: AlertClickAction): Promise<void> {
    const event = new AlertClicked(investingTicker, action);
    await this.alertRepo.createAlertClickEvent(event);
  }

  /**
   * Get pair info for current ticker using the first Alert Ticker
   * @private
   */
  private async getCurrentPairInfo(): Promise<PairInfo> {
    const alertTicker = await this.getFirstAlertTicker();
    if (!alertTicker) {
      const tvTicker = this.tickerManager.getTicker();
      throw new Error(`No Alert Ticker found for ${tvTicker}`);
    }
    return new PairInfo(alertTicker.name, alertTicker.pair_id, alertTicker.exchange ?? '', alertTicker.symbol);
  }
}
