/**
 * Interface and implementations for alert handling operations
 */

import { IAlertManager } from '../manager/alert';
import { ITickerManager } from '../manager/ticker';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { IDomManager } from '../manager/dom';
import { ITradingViewManager } from '../manager/tv';
import { Constants } from '../models/constant';
import { ApiError } from '../models/api_error';
import { Notifier } from '../util/notify';
import { IUIUtil } from '../util/ui';
import { AlertTicker } from '../models/alert_ticker';
import { AlertClicked, AlertClickAction } from '../models/events';
import { ITickerHandler } from './ticker';
import { IAlertTickerHandler } from './alert_ticker';

import { PairInfo } from '../models/alert';

/**
 * Interface for managing alert operations
 */
export interface IAlertHandler {
  /**
   * Creates alerts from textbox values
   */
  createAlertsFromTextBox(input: string): Promise<void>;

  /**
   * Creates alert at cursor price position
   */
  createAlertAtCursor(): Promise<void>;

  /**
   * Deletes alerts near cursor price
   */
  deleteAlertAtCursor(): Promise<void>;

  /**
   * Handles refresh button operations
   * - Forces alert refresh
   * - Handles order set cleanup
   */
  handleRefreshButton(): void;

  /**
   * Handles alert button actions based on modifiers
   * - Maps current exchange to TV ticker with Ctrl key
   * - Creates high alert without modifiers
   * @param e Mouse event with modifier info
   */
  handleAlertButton(e: MouseEvent): void;

  /**
   * Handles alert context menu event
   * Prevents default and triggers ticker refresh/audit
   * @param e Context menu event object
   */
  handleAlertContextMenu(e: Event): void;

  /**
   * Handles alert click events from feed
   * Opens appropriate ticker using TickerHandler
   * @param event AlertClicked event containing ticker info
   */
  handleAlertClick(event: AlertClicked): void;

  /**
   * Reset alerts by deleting all alerts for current ticker
   * Ensures UI is refreshed after operation
   */
  handleResetAlerts(): Promise<void>;

  /**
   * Registers a delegated right-click handler on display-area alert ticker rows
   * for delink/delete of individual alert ticker mappings.
   */
  registerAlertTickerDelinkHandler(): void;
}

/**
 * Handles alert operations and user interactions
 */
export class AlertHandler implements IAlertHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly alertManager: IAlertManager,
    private readonly tradingViewManager: ITradingViewManager,
    private readonly domManager: IDomManager,
    private readonly tickerManager: ITickerManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly uiUtil: IUIUtil,
    private readonly tickerHandler: ITickerHandler,
    private readonly alertTickerHandler: IAlertTickerHandler
  ) {}

  /** @inheritdoc */
  public async createAlertsFromTextBox(input: string): Promise<void> {
    const prices = String(input).trim().split(' ');
    for (const p of prices) {
      const price = parseFloat(p);
      await this.createAlertAndNotify(price);
    }

    setTimeout(() => {
      // Can't move to Command Handler due to Cyclic Dependency
      $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val('');
    }, 5000);
  }

  /**
   * Displays appropriate notification for alert creation based on price comparison with LTP
   * @param alertPrice Price at which alert was created
   * @private
   */
  private notifyAlertCreation(alertPrice: number, pairInfo: PairInfo): void {
    const ltp = this.tradingViewManager.getLastTradedPrice();
    if (alertPrice > ltp) {
      Notifier.success(`👆  ${pairInfo.name} - ${alertPrice}`);
    } else {
      Notifier.red(`👇 ${pairInfo.name}  - ${alertPrice}`);
    }
  }

  /**
   * Creates an alert for the current ticker at the given price and notifies the user.
   * @private
   */
  private async createAlertAndNotify(price: number): Promise<void> {
    const pairInfo = await this.alertManager.createAlertForCurrentTicker(price);
    this.notifyAlertCreation(price, pairInfo);
  }

  /** @inheritdoc */
  public async createAlertAtCursor(): Promise<void> {
    const price = await this.tradingViewManager.getCursorPrice();
    await this.createAlertAndNotify(price);
  }

  /**
   * Creates an alert 20% above the current market price.
   * Called internally by handleAlertButton() when no Ctrl key is pressed.
   */
  private async createHighAlert(): Promise<void> {
    const currentPrice = this.tradingViewManager.getLastTradedPrice();
    const targetPrice = (currentPrice * 1.2).toFixed(2);
    const price = parseFloat(targetPrice);
    await this.createAlertAndNotify(price);
  }

  /** @inheritdoc */
  public async deleteAlertAtCursor(): Promise<void> {
    const price = await this.tradingViewManager.getCursorPrice();
    await this.alertManager.deleteAlertsByPrice(price);
    Notifier.red(`❌ Alerts deleted around price: ${price}`);
  }

  /**
   * Forces a full refresh of all alerts from the Investing.com backend.
   * Called internally by handleRefreshButton().
   */
  private async refreshAllAlerts(): Promise<void> {
    const count = await this.alertManager.refreshAlerts();
    if (count > 0) {
      Notifier.success(`Loaded ${count} alerts`);
    } else {
      Notifier.warn('No alerts found');
    }
  }

  /** @inheritdoc */
  public handleRefreshButton(): void {
    void this.refreshAllAlerts();
  }

  /** @inheritdoc */
  public handleAlertButton(e: MouseEvent): void {
    if (e.ctrlKey) {
      // Map current exchange to current TV ticker
      const ticker = this.domManager.getTicker();
      const exchange = this.domManager.getCurrentExchange();
      void this.tickerManager.setExchange(ticker, exchange).then(() => {
        Notifier.success(`Mapped ${ticker} to ${exchange}`);
      });
    } else {
      void this.createHighAlert();
    }
  }

  /** @inheritdoc */
  public handleAlertContextMenu(e: Event): void {
    e.preventDefault();
    void this.alertTickerHandler.linkInvestingTicker(this.domManager.getTicker());
  }

  /** @inheritdoc */
  public handleAlertClick(event: AlertClicked): void {
    switch (event.action) {
      case AlertClickAction.MAP:
        void this.handleMapAction(event);
        break;
      case AlertClickAction.OPEN:
        void this.handleOpenAction(event);
        break;
      default:
        throw new Error(`Unknown alert action: ${event.action}`);
    }
  }

  /**
   * Handles MAP action: links investing ticker to current TV ticker using pairId.
   * Skips duplicate linking when primary symbol already matches.
   */
  private async handleMapAction(event: AlertClicked): Promise<void> {
    if (!event.pairId) {
      Notifier.warn(`Cannot map ${event.alertTicker}: no pairId in event`);
      return;
    }

    const ticker = this.domManager.getTicker();
    const exchange = this.domManager.getCurrentExchange();

    let alertTickers: AlertTicker[];
    try {
      alertTickers = await this.alertTickerManager.getAlertTickersForTicker(ticker);
    } catch (error) {
      if (ApiError.isNotFoundError(error)) {
        Notifier.warn(`Start tracking ${ticker} before mapping ${event.alertTicker}`);
        return;
      }
      throw error;
    }
    const alreadyLinked = alertTickers.some((at) => at.symbol === event.alertTicker);
    if (alreadyLinked) {
      Notifier.info(`Already mapped: ${event.alertTicker} → ${ticker}`);
      return;
    }

    await this.alertTickerManager.linkAlertTicker(ticker, {
      symbol: event.alertTicker,
      pair_id: event.pairId,
      name: event.alertName ?? event.alertTicker,
      exchange,
    });
    Notifier.success(`Mapped ${ticker} to ${event.alertTicker}`);
  }

  /**
   * Handles OPEN action: navigates to the appropriate ticker.
   * Uses mapped TV ticker if available, otherwise opens investing ticker raw.
   */
  private async handleOpenAction(event: AlertClicked): Promise<void> {
    const alertTicker = await this.alertTickerManager.fetchAlertTicker(event.alertTicker);
    if (!alertTicker) {
      Notifier.warn(`Unmapped: ${event.alertTicker}`);
      void this.tickerHandler.openTicker(event.alertTicker);
    } else {
      void this.tickerHandler.openTicker(alertTicker.ticker);
    }
  }

  /** @inheritdoc */
  public async handleResetAlerts(): Promise<void> {
    await this.alertManager.deleteAllAlerts();
    Notifier.red('❌ 🚀 All alerts deleted');
  }

  // ── Alert Ticker Delink ──

  /** @inheritdoc */
  public registerAlertTickerDelinkHandler(): void {
    const $card = $(`#${Constants.UI.IDS.DISPLAY.CARD}`);
    $card.on('contextmenu', `.${Constants.UI.IDS.DISPLAY.ALERT_TICKER_ROW}`, (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleAlertTickerDelink($(e.currentTarget));
    });
  }

  /**
   * Handles right-click delink on an alert ticker row.
   * Confirms deletion, then refreshes display on success.
   * @param $row - The right-clicked alert ticker row element
   */
  private async handleAlertTickerDelink($row: JQuery): Promise<void> {
    const symbol = $row.attr(Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_SYMBOL) || '';
    const type = $row.attr(Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_TYPE) || '';

    if (!symbol) {
      return;
    }

    const isPrimary = type === 'PRIMARY';
    const confirmText = isPrimary
      ? `Delink PRIMARY ${symbol}? This ticker will be unmapped until you map a new primary.`
      : `Delink ${symbol}?`;

    if (!this.uiUtil.showConfirm(confirmText)) {
      return;
    }

    try {
      await this.alertTickerManager.deleteAlertTicker(symbol);
      Notifier.success(`⏹ Delinked ${symbol}`);
    } catch (error) {
      Notifier.warn(`Failed to delink ${symbol}: ${(error as Error).message}`);
    }
  }
}
