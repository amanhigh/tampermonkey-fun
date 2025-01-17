/**
 * Interface and implementations for alert handling operations
 */

import { IAlertManager } from '../manager/alert';
import { ISymbolManager } from '../manager/symbol';
import { ITickerManager } from '../manager/ticker';
import { ITradingViewManager } from '../manager/tv';
import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';
import { IUIUtil } from '../util/ui';
import { ISyncUtil } from '../util/sync';
import { AlertClicked, AlertClickAction } from '../models/events';
import { IAlertSummaryHandler } from './alert_summary';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { IAuditHandler } from './audit';

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
  // TODO: #C Linter to find unused Public Methods

  /**
   * Creates alert 20% above current price
   */
  createHighAlert(): Promise<void>;

  /**
   * Deletes alerts near cursor price
   */
  deleteAlertAtCursor(): Promise<void>;

  /**
   * Refreshes local alerts with synchronization
   */
  refreshAlerts(): void;

  /**
   * Forces a refresh of all alerts from server
   */
  refreshAllAlerts(): Promise<void>;

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
   * Handles the journal button toggle event
   * @param e Event object
   */
  handleJournalButton(e: Event): void;

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
}

/**
 * Handles alert operations and user interactions
 */
export class AlertHandler implements IAlertHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly alertManager: IAlertManager,
    private readonly tradingViewManager: ITradingViewManager,
    private readonly auditHandler: IAuditHandler,
    private readonly tickerManager: ITickerManager,
    private readonly symbolManager: ISymbolManager,
    private readonly syncUtil: ISyncUtil,
    private readonly uiUtil: IUIUtil,
    private readonly alertSummaryHandler: IAlertSummaryHandler,
    private readonly tickerHandler: ITickerHandler,
    private readonly pairHandler: IPairHandler
  ) {}

  /** @inheritdoc */
  public async createAlertsFromTextBox(input: string): Promise<void> {
    const prices = String(input).trim().split(' ');
    for (const p of prices) {
      try {
        const price = parseFloat(p);
        await this.alertManager.createAlertForCurrentTicker(price);
        this.refreshAlerts();
        this.notifyAlertCreation(price);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Notifier.error(message);
      }
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
  private notifyAlertCreation(alertPrice: number): void {
    const ltp = this.tradingViewManager.getLastTradedPrice();
    if (alertPrice > ltp) {
      Notifier.success(`Alert ${alertPrice} > LTP ${ltp}`);
    } else {
      Notifier.error(`Alert ${alertPrice} < LTP ${ltp}`);
    }
  }

  /** @inheritdoc */
  public async createAlertAtCursor(): Promise<void> {
    try {
      const price = await this.tradingViewManager.getCursorPrice();
      await this.alertManager.createAlertForCurrentTicker(price);
      this.refreshAlerts();
      this.notifyAlertCreation(price);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  /** @inheritdoc */
  public async createHighAlert(): Promise<void> {
    const currentPrice = this.tradingViewManager.getLastTradedPrice();
    if (currentPrice === null) {
      Notifier.error('Could not get current price');
      return;
    }

    const targetPrice = (currentPrice * 1.2).toFixed(2);
    try {
      const price = parseFloat(targetPrice);
      await this.alertManager.createAlertForCurrentTicker(price);
      this.refreshAlerts();
      this.notifyAlertCreation(price);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  /** @inheritdoc */
  public async deleteAlertAtCursor(): Promise<void> {
    try {
      const price = await this.tradingViewManager.getCursorPrice();
      await this.alertManager.deleteAlertsByPrice(price);
      this.refreshAlerts();
      Notifier.warn(`Alerts deleted around price: ${price}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  /** @inheritdoc */
  public refreshAlerts(): void {
    this.syncUtil.waitOn('alert-refresh-local', 10, () => {
      const alerts = this.alertManager.getAlerts();
      this.alertSummaryHandler.displayAlerts(alerts);
      this.auditHandler.auditCurrent();
    });
  }

  /** @inheritdoc */
  public async refreshAllAlerts(): Promise<void> {
    const count = await this.alertManager.reloadAlerts();
    if (count > 0) {
      Notifier.success(`Loaded ${count} alerts`);
    } else {
      Notifier.warn('No alerts found');
    }

    this.refreshAlerts();
    await this.auditHandler.auditAll();
  }

  /** @inheritdoc */
  public handleRefreshButton(): void {
    // Refresh alerts
    void this.refreshAllAlerts();

    // Use WatchlistHandler for cleanup
    // TODO: Enable Back Cleanup
    // void this.watchListHandler.handleWatchlistCleanup();
  }

  /** @inheritdoc */
  public handleAlertButton(e: MouseEvent): void {
    if (e.ctrlKey) {
      // Map current exchange to current TV ticker
      const ticker = this.tickerManager.getTicker();
      const exchange = this.tickerManager.getCurrentExchange();
      this.symbolManager.createTvToExchangeTickerMapping(ticker, exchange);
      Notifier.success(`Mapped ${ticker} to ${exchange}`);
    } else {
      void this.createHighAlert();
    }
  }

  /** @inheritdoc */
  public handleJournalButton(): void {
    this.uiUtil.toggleUI(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
  }

  /** @inheritdoc */
  public handleAlertContextMenu(e: Event): void {
    // Prevent default context menu
    e.preventDefault();

    const event = e as MouseEvent; // Cast to access modifier keys
    if (event.ctrlKey) {
      void this.pairHandler.mapInvestingTicker(this.tickerManager.getInvestingTicker());
    } else if (event.shiftKey) {
      this.pairHandler.deletePairInfo(this.tickerManager.getInvestingTicker());
    } else {
      // Regular audit operation
      this.auditHandler.auditCurrent();
    }
    this.refreshAlerts();
  }

  /** @inheritdoc */
  public handleAlertClick(event: AlertClicked): void {
    switch (event.action) {
      case AlertClickAction.MAP:
        // Map TV Ticker to Investing Ticker
        this.symbolManager.createTvToInvestingMapping(this.tickerManager.getTicker(), event.ticker);
        void this.pairHandler.mapInvestingTicker(event.ticker);
        Notifier.success(`Mapped ${this.tickerManager.getTicker()} to ${event.ticker}`);
        break;
      case AlertClickAction.OPEN:
        const tvTicker = this.symbolManager.investingToTv(event.ticker);
        if (!tvTicker) {
          Notifier.error(`Unmapped: ${event.ticker}`);
          return;
        }
        this.tickerHandler.openTicker(tvTicker);
        break;
      default:
        Notifier.error('No valid action found in alert click event');
    }
  }

  /** @inheritdoc */
  public async handleResetAlerts(): Promise<void> {
    try {
      await this.alertManager.deleteAllAlerts();
      this.refreshAlerts();
      Notifier.success('All alerts deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }
}
