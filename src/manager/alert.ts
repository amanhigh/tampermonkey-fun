import { IInvestingClient } from '../client/investing';
import { IPriceAlertClient } from '../client/price_alert';
import { Alert, PairInfo } from '../models/alert';
import { Constants } from '../models/constant';
import { AlertClicked, AlertClickAction } from '../models/events';
import { PriceAlert, PriceAlertInput } from '../models/price_alert';
import { Notifier } from '../util/notify';
import { IAlertTickerManager } from './alert_ticker';
import { IDomManager } from './dom';
import { ITradingViewManager } from './tv';
import { IPublisher } from './event_bus';
import { DomainEventType } from '../models/domain_event';

/**
 * Interface for managing alert operations.
 */
export interface IAlertManager {
  /**
   * Get all alerts for current TradingView ticker.
   * @returns Promise resolving to array of alerts sorted by price
   */
  // FIXME: Check Batch Size Optimization here.
  getAlerts(): Promise<Alert[]>;

  /**
   * Get all alerts for a specific TradingView ticker.
   * @param tvTicker TradingView ticker
   * @returns Promise resolving to array of alerts sorted by price
   */
  getAlertsForTicker(tvTicker: string): Promise<Alert[]>;

  /**
   * Create alert for current TradingView ticker.
   * @param price Alert price
   * @throws Error If no alert ticker found for current ticker
   */
  createAlertForCurrentTicker(price: number): Promise<PairInfo>;

  /**
   * Delete all alerts for current ticker.
   */
  deleteAllAlerts(): Promise<void>;

  /**
   * Delete alerts near target price for current ticker.
   * @param targetPrice Price to delete alerts around
   */
  deleteAlertsByPrice(targetPrice: number): Promise<void>;

  /**
   * Delete specified alert by alert ID.
   * @param alertId Alert identifier
   * @throws Error if deletion fails
   */
  deleteAlert(alertId: string): Promise<void>;

  /**
   * Refresh alerts from Investing.com into backend Price Alert store.
   * @returns Promise resolving to number of parsed alerts sent to backend
   */
  // HACK: Seperate Class for Referesh Logic ?
  refreshAlerts(): Promise<number>;

  /**
   * Creates alert click event for ticker operations.
   * @param alertExchange - Optional exchange from resolved identity (alert_ticker or instrument)
   */
  createAlertClickEvent(
    alertTicker: string,
    action: AlertClickAction,
    pairId?: string,
    alertName?: string,
    alertExchange?: string
  ): Promise<void>;
}

/**
 * Manages alert operations using Investing.com for live actions and Kohan Price Alert APIs for storage.
 */
export class AlertManager implements IAlertManager {
  private static readonly ALERT_PRICE_TOLERANCE = 0.03;

  constructor(
    private readonly priceAlertClient: IPriceAlertClient,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly domManager: IDomManager,
    private readonly investingClient: IInvestingClient,
    private readonly tradingViewManager: ITradingViewManager,
    private readonly publisher: IPublisher
  ) {}

  /** @inheritdoc */
  async getAlerts(): Promise<Alert[]> {
    const tvTicker = this.domManager.getTicker();
    return this.listAlertsByTvTicker(tvTicker);
  }

  /** @inheritdoc */
  async getAlertsForTicker(tvTicker: string): Promise<Alert[]> {
    return this.listAlertsByTvTicker(tvTicker);
  }

  /** @inheritdoc */
  async createAlertForCurrentTicker(price: number): Promise<PairInfo> {
    const result = await this.createAlert(price);
    await this.publishAlertsChanged();
    return result;
  }

  /** @inheritdoc */
  async deleteAllAlerts(): Promise<void> {
    const alerts = await this.getAlerts();
    const deletableAlerts = alerts.filter((alert) => alert.id !== '');
    if (deletableAlerts.length === 0) {
      Notifier.warn('No alerts found to delete');
      return;
    }
    await Promise.all(deletableAlerts.map(async (alert) => this.deleteAlertById(alert.id)));
    await this.publishAlertsChanged();
  }

  /** @inheritdoc */
  async deleteAlertsByPrice(targetPrice: number): Promise<void> {
    const tolerance = targetPrice * AlertManager.ALERT_PRICE_TOLERANCE;
    const alerts = await this.getAlerts();
    const filteredAlerts = alerts.filter(
      (alert) => alert.id !== '' && Math.abs(alert.price - targetPrice) <= tolerance
    );

    if (filteredAlerts.length === 0) {
      Notifier.warn('No alerts found within price tolerance');
      return;
    }

    await Promise.all(filteredAlerts.map(async (alert) => this.deleteAlertById(alert.id)));
    await this.publishAlertsChanged();
  }

  /** @inheritdoc */
  async deleteAlert(alertId: string): Promise<void> {
    await this.deleteAlertById(alertId);
    await this.publishAlertsChanged();
  }

  /** @inheritdoc */
  async refreshAlerts(): Promise<number> {
    const html = await this.investingClient.getAllAlerts();
    const alerts = this.parsePriceAlertsFromHtml(html);
    await this.priceAlertClient.replacePriceAlerts({ alerts });
    const count = alerts.length;
    await this.publishAlertsChanged();
    return count;
  }

  /** @inheritdoc */
  async createAlertClickEvent(
    alertTicker: string,
    action: AlertClickAction,
    pairId?: string,
    alertName?: string,
    alertExchange?: string
  ): Promise<void> {
    const event = new AlertClicked(alertTicker, action, pairId, alertName, alertExchange);
    await GM.setValue(Constants.STORAGE.EVENTS.ALERT_CLICKED, event.stringify());
  }

  // ── Private Helpers ──

  /**
   * Internal delete by alert ID without publishing ALERTS_CHANGED.
   * Used by batch methods to avoid duplicate events.
   */
  private async deleteAlertById(alertId: string): Promise<void> {
    try {
      await this.investingClient.deleteAlert(new Alert(alertId, '', 0));
      await this.priceAlertClient.deletePriceAlert(alertId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to delete alert ${alertId}: ${message}`);
    }
  }

  /**
   * Publish ALERTS_CHANGED event for the current ticker.
   */
  private async publishAlertsChanged(): Promise<void> {
    const ticker = this.domManager.getTicker();
    await this.publisher.publish({
      type: DomainEventType.ALERTS_CHANGED,
      ticker,
    });
  }

  /**
   * Create alert via Investing.com and persist pending alert in Kohan.
   */
  private async createAlert(price: number): Promise<PairInfo> {
    const tvTicker = this.domManager.getTicker();
    const alertTicker = await this.alertTickerManager.getPrimaryAlertTicker(tvTicker);
    if (!alertTicker) {
      throw new Error(`No primary alert ticker found for ${tvTicker}`);
    }

    const pairInfo = new PairInfo(
      alertTicker.name,
      alertTicker.pair_id,
      alertTicker.exchange ?? '',
      alertTicker.symbol
    );

    try {
      const ltp = this.tradingViewManager.getLastTradedPrice();
      await this.investingClient.createAlert(pairInfo.name, pairInfo.pairId, price, ltp);
      await this.priceAlertClient.createPendingPriceAlert(tvTicker, { trigger_price: price });
      return pairInfo;
    } catch {
      throw new Error(`Failed to create alert for ${alertTicker.symbol} at price ${price}`);
    }
  }

  /**
   * List backend price alerts for a TV ticker and adapt them to UI Alert model.
   */
  private async listAlertsByTvTicker(tvTicker: string): Promise<Alert[]> {
    const priceAlerts = await this.priceAlertClient.listPriceAlerts({
      ticker: tvTicker,
      'sort-by': 'trigger_price',
      'sort-order': 'asc',
    });
    return priceAlerts.map((alert) => this.toAlert(alert));
  }

  /**
   * Convert backend PriceAlert model to legacy UI Alert model.
   */
  private toAlert(alert: PriceAlert): Alert {
    return new Alert(alert.alert_id ?? '', alert.pair_id, alert.trigger_price);
  }

  /**
   * Parse Investing.com alert-center HTML into backend PriceAlertInput rows.
   */
  private parsePriceAlertsFromHtml(html: string): PriceAlertInput[] {
    const alerts: PriceAlertInput[] = [];

    $(html)
      .find('.js-alert-item[data-trigger=price]')
      .each((_, alertElement) => {
        const $alert = $(alertElement);
        const pairId = $alert.attr('data-pair-id') || '';
        const price = parseFloat($alert.attr('data-value') || '0');
        const alertId = $alert.attr('data-alert-id') || '';

        if (pairId && !isNaN(price) && alertId && price > 0) {
          alerts.push({ pair_id: pairId, alert_id: alertId, trigger_price: price });
        } else {
          console.warn('Invalid alert:', pairId, alertId, price);
        }
      });

    return alerts;
  }
}
