/**
 * Interface and implementations for alert handling operations
 */

import { IAlertManager } from '../manager/alert';
import { IAuditManager } from '../manager/audit';
import { ISymbolManager } from '../manager/symbol';
import { ITickerManager } from '../manager/ticker';
import { ITradingViewManager } from '../manager/tv';
import { IWatchManager } from '../manager/watch';
import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';
import { IUIUtil } from '../util/ui';
import { ISyncUtil } from '../util/sync';

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
  refershAllAllerts(): Promise<void>;

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
}

/**
 * Handles alert operations and user interactions
 */
export class AlertHandler implements IAlertHandler {
  constructor(
    private readonly alertManager: IAlertManager,
    private readonly tradingViewManager: ITradingViewManager,
    private readonly auditManager: IAuditManager,
    private readonly watchManager: IWatchManager,
    private readonly tickerManager: ITickerManager,
    private readonly symbolManager: ISymbolManager,
    private readonly syncUtil: ISyncUtil,
    private readonly uiUtil: IUIUtil
  ) {}

  /** @inheritdoc */
  public async createAlertsFromTextBox(input: string): Promise<void> {
    const prices = String(input).trim().split(' ');
    for (const p of prices) {
      try {
        await this.alertManager.createAlertForCurrentTicker(parseFloat(p));
        // TODO: Alert Coloring based on Above or Below
        Notifier.success(`Alert created at ${p}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Notifier.error(message);
      }
    }

    setTimeout(() => {
      $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val('');
    }, 5000);
  }

  /** @inheritdoc */
  public async createAlertAtCursor(): Promise<void> {
    try {
      const price = await this.tradingViewManager.getCursorPrice();
      await this.alertManager.createAlertForCurrentTicker(price);
      Notifier.success(`Alert created at cursor price: ${price}`);
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
      await this.alertManager.createAlertForCurrentTicker(parseFloat(targetPrice));
      Notifier.success(`High alert created at ${targetPrice}`);
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
      Notifier.success(`Alerts deleted around price: ${price}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  /** @inheritdoc */
  public refreshAlerts(): void {
    this.syncUtil.waitOn('alert-refresh-local', 10, () => {
      const alerts = this.alertManager.getAlerts();
      // FIXME: Use AlertSummary Manager
      this.displayAlerts(alerts);
      //TODO: Audit Current
    });
  }

  /** @inheritdoc */
  public async refershAllAllerts(): Promise<void> {
    const count = await this.alertManager.reloadAlerts();
    if (count > 0) {
      Notifier.success(`Loaded ${count} alerts`);
    } else {
      Notifier.warn('No alerts found');
    }

    this.refreshAlerts();
    // TODO: Audit All
  }

  /** @inheritdoc */
  public handleRefreshButton(): void {
    // Refresh alerts
    void this.refershAllAllerts();

    // Handle order set cleanup
    this.watchManager.handleWatchlistCleanup();
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

    // Perform audit
    this.auditManager.auditCurrentTicker();
  }
}
