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
import { IWatchListHandler } from './watchlist';
import { ITickerHandler } from './ticker';
import { IPairHandler } from './pair';
import { IAuditHandler } from './audit';
import { IAlertFeedManager } from '../manager/alertfeed';
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
    private readonly pairHandler: IPairHandler,
    private readonly alertFeedManager: IAlertFeedManager,
    private readonly watchListHandler: IWatchListHandler
  ) {}

  /** @inheritdoc */
  public async createAlertsFromTextBox(input: string): Promise<void> {
    const prices = String(input).trim().split(' ');
    for (const p of prices) {
      const price = parseFloat(p);
      await this.alertManager.createAlertForCurrentTicker(price).then((pairInfo) => {
        this.refreshAlerts();
        this.notifyAlertCreation(price, pairInfo);
      });
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

  /** @inheritdoc */
  public async createAlertAtCursor(): Promise<void> {
    const price = await this.tradingViewManager.getCursorPrice();
    await this.alertManager.createAlertForCurrentTicker(price).then((pairInfo) => {
      this.refreshAlerts();
      this.notifyAlertCreation(price, pairInfo);
    });
  }

  /** @inheritdoc */
  public async createHighAlert(): Promise<void> {
    const currentPrice = this.tradingViewManager.getLastTradedPrice();
    const targetPrice = (currentPrice * 1.2).toFixed(2);
    const price = parseFloat(targetPrice);
    await this.alertManager.createAlertForCurrentTicker(price).then((pairInfo) => {
      this.refreshAlerts();
      this.notifyAlertCreation(price, pairInfo);
    });
  }

  /** @inheritdoc */
  public async deleteAlertAtCursor(): Promise<void> {
    const price = await this.tradingViewManager.getCursorPrice();
    await this.alertManager.deleteAlertsByPrice(price);
    this.refreshAlerts();
    Notifier.red(`❌ Alerts deleted around price: ${price}`);
  }

  /** @inheritdoc */
  public refreshAlerts(): void {
    this.syncUtil.waitOn('alert-refresh-local', 10, () => {
      try {
        const alerts = this.alertManager.getAlerts();
        this.alertSummaryHandler.displayAlerts(alerts);
        this.auditHandler.auditCurrent();
      } catch (error) {
        // Show NO PAIR for Null Alerts
        this.alertSummaryHandler.displayAlerts(null);

        const tvTicker = this.tickerManager.getTicker();
        // Igoner Error for Composite Symbols as its expected.
        if (!this.symbolManager.isComposite(tvTicker)) {
          throw error;
        }
      }
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
    void this.watchListHandler.handleWatchlistCleanup();
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
    e.preventDefault();
    // Only keep audit operation
    this.auditHandler.auditCurrent();
  }

  /** @inheritdoc */
  public handleAlertClick(event: AlertClicked): void {
    switch (event.action) {
      case AlertClickAction.MAP:
        // Map TV Ticker to Investing Ticker
        const tvTickerNow = this.tickerManager.getTicker();
        void this.alertFeedManager.createAlertFeedEvent(tvTickerNow);
        void this.pairHandler.mapInvestingTicker(event.investingTicker).then(() => {
          this.refreshAlerts();
        });
        Notifier.success(`Mapped ${this.tickerManager.getTicker()} to ${event.investingTicker}`);
        break;
      case AlertClickAction.OPEN:
        const tvTicker = this.symbolManager.investingToTv(event.investingTicker);
        if (!tvTicker) {
          Notifier.warn(`Unmapped: ${event.investingTicker}`);
          this.tickerHandler.openTicker(event.investingTicker);
        } else {
          this.tickerHandler.openTicker(tvTicker);
        }
        break;
      default:
        throw new Error(`Unknown alert action: ${event.action}`);
    }
  }

  /** @inheritdoc */
  public async handleResetAlerts(): Promise<void> {
    await this.alertManager.deleteAllAlerts();
    this.refreshAlerts();
    Notifier.red('❌ 🚀 All alerts deleted');
  }
}
