import { IKiteManager } from '../manager/kite';
import { ISymbolManager } from '../manager/symbol';
import { ITickerManager } from '../manager/ticker';
import { IWaitUtil } from '../util/wait';
import { Constants } from '../models/constant';
import { Order, GttApiResponse } from '../models/kite';
import { GttCreateEvent, GttRefreshEvent, GttDeleteEvent } from '../models/gtt';
import { Notifier } from '../util/notify';
import { ITradingViewManager } from '../manager/tv';
import { IUIUtil } from '../util/ui';

/**
 * Configuration for order button display
 */
interface ButtonConfig {
  text: string;
  color: string;
}

/**
 * Interface for managing Kite platform operations and UI interactions
 */
export interface IKiteHandler {
  /**
   * Initializes Kite event handlers and listeners
   */
  setUpListners(): void;

  /**
   * Processes GTT delete events from listener
   * @param event GTT deletion event to process
   */
  handleGttDeleteEvent(event: GttDeleteEvent): void;

  /**
   * Processes GTT order creation requests
   * @param request The GTT request parameters
   */
  handleGttCreateRequest(request: GttCreateEvent): Promise<void>;

  /**
   * Handles GTT order button click events
   */
  handleGttOrderButton(): Promise<void>;

  /**
   * Handles delete order button click events
   * @param $button The button element that was clicked
   */
  handleDeleteOrderButton($button: JQuery): void;

  /**
   * Generates a summary of GTT orders in the Info Area
   * @param gttOrderMap Object containing GTT orders
   */
  refreshGttOrders(): Promise<void>;

  /**
   * Sets up GTT refresh event listener
   */
  setupGttRefreshListener(): void;
}

/**
 * Handles Kite platform events and UI interactions
 * @class KiteHandler
 */
export class KiteHandler implements IKiteHandler {
  /**
   * GTT tab selector
   * @private
   */
  private readonly gttSelector = '.router-link-exact-active';

  /**
   * @param kiteManager - Manager for Kite operations
   * @param symbolManager - Manager for symbol operations
   * @param waitUtil - Utility for waiting operations
   * @param tickerManager - Manager for ticker operations
   * @param tvManager - Manager for TradingView operations
   * @param uiUtil - Utility for UI operations
   */
  constructor(
    private readonly kiteManager: IKiteManager,
    private readonly symbolManager: ISymbolManager,
    private readonly waitUtil: IWaitUtil,
    private readonly tickerManager: ITickerManager,
    private readonly tvManager: ITradingViewManager,
    private readonly uiUtil: IUIUtil
  ) {}

  /** @inheritdoc */
  public setupGttRefreshListener(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.GTT_REFERSH,
      (_keyName: string, _oldValue: unknown, _newValue: unknown) => {
        // Update order summary when GTT refresh event is received
        void this.refreshGttOrders();
      }
    );
  }

  /** @inheritdoc */
  setUpListners(): void {
    this.setupGttTabListener();
    this.setupGttCreateListener();
    this.setupGttDeleteListener();
  }

  /** @inheritdoc */
  async handleGttCreateRequest(request: GttCreateEvent): Promise<void> {
    await this.kiteManager.createOrder(request);
    Notifier.success(`GTT Order Created: ${request.symb}`);
  }

  /** @inheritdoc */
  async handleGttOrderButton(): Promise<void> {
    const order = this.readOrderPanel();

    // Build request object in expected format
    const tvTicker = this.tickerManager.getTicker();
    const kiteSymbol = this.symbolManager.tvToKite(tvTicker);
    const event = new GttCreateEvent(
      kiteSymbol,
      order.qty,
      this.tvManager.getLastTradedPrice(),
      order.sl,
      order.ent,
      order.tp
    );

    if (this.validateOrder(event)) {
      this.displayOrderMessage(event);
      await this.kiteManager.createGttOrderEvent(event);
      this.closeOrderPanel();
    } else {
      alert('Invalid GTT Input');
    }
  }

  /** @inheritdoc */
  handleDeleteOrderButton($button: JQuery): void {
    const orderId = $button.data('order-id') as string;
    const symbol = this.tickerManager.getTicker();
    void this.kiteManager.createGttDeleteEvent(orderId, symbol);
    Notifier.red(`GTT Delete: ${orderId}`);
  }

  /** @inheritdoc */
  handleGttDeleteEvent(event: GttDeleteEvent): void {
    this.kiteManager.deleteOrder(event.orderId);
    Notifier.red(`GTT Deleted: ${event.symbol}`);
  }

  /** @inheritdoc */
  async refreshGttOrders(): Promise<void> {
    const currentTicker = this.tickerManager.getTicker();
    const gttData = await this.kiteManager.getGttRefereshEvent();
    const ordersForTicker = gttData.getOrdersForTicker(currentTicker);

    // Check for unwatched GTT tickers and show warning
    const unwatchedTickers = this.kiteManager.getUnwatchedGttTickers(gttData);
    if (unwatchedTickers.length > 0) {
      const tickerList = unwatchedTickers.join(', ');
      // FIXME: Move to Audit ?
      Notifier.warn(`GTT Orders not in primary lists: ${tickerList}`, 5000);
      
      // TODO: Duplicate GTT Orders Audit.
    }

    const $ordersContainer = $(`#${Constants.UI.IDS.AREAS.ORDERS}`);

    $ordersContainer.empty();

    if (ordersForTicker.length === 0) {
      return;
    }

    ordersForTicker.reverse().forEach((order) => {
      const buttonConfig = this.getOrderButtonConfig(order);
      const $button = this.createOrderButton(buttonConfig).data('order-id', order.id);
      $button.appendTo($ordersContainer);
    });
  }

  /**
   * Generates a map of GTT orders based on the response from the GTT API
   * Generates GTT Order Event in GM Cache
   * @private
   * @param gttResponse - The response object from the GTT API
   */
  /**
   * Processes GTT API response and generates refresh event
   * @private
   * @param gttResponse API response containing GTT orders
   */
  private async saveGttMap(gttResponse: GttApiResponse): Promise<void> {
    // Only process if we have valid data
    if (!gttResponse?.data) {
      throw new Error(`Invalid GTT Response: ${JSON.stringify(gttResponse)}`);
      return;
    }

    const refreshEvent = new GttRefreshEvent();

    // Process active GTT orders
    gttResponse.data
      .filter((gtt) => gtt.status === 'active' && gtt.orders?.length > 0)
      .forEach((gtt) => {
        const symbol = this.symbolManager.kiteToTv(gtt.orders[0].tradingsymbol);
        const order = new Order(symbol, gtt.orders[0].quantity, gtt.type, gtt.id, gtt.condition.trigger_values);
        refreshEvent.addOrder(symbol, order);
      });

    // Store and notify based on order count
    const length = refreshEvent.getCount();
    await this.kiteManager.createGttRefreshEvent(refreshEvent);
    Notifier.success(`GTT Map Built. Count: ${length}`);
  }

  /**
   * Sets up GTT order change listener
   * @private
   */
  private setupGttCreateListener(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.GTT_CREATE,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        // Convert string to GttCreateEvent before passing to handler
        const event = GttCreateEvent.fromString(newValue as string);
        void this.handleGttCreateRequest(event);
      }
    );
  }

  private setupGttDeleteListener(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.GTT_DELETE,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        // Convert string to GttDeleteEvent before passing to handler
        const event = GttDeleteEvent.fromString(newValue as string);
        void this.handleGttDeleteEvent(event);
      }
    );
  }

  /**
   * Sets up GTT tab refresh listener
   * Triggers order refresh when GTT tab is activated
   * @private
   */
  private setupGttTabListener(): void {
    this.waitUtil.waitJEE(this.gttSelector, ($element) => {
      $element.click(() => void this.reloadGttOrders());
    });
  }

  /**
   * Loads and processes GTT orders after delay
   * Delay allows UI to update after tab change
   */
  private async reloadGttOrders(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await new Promise<GttApiResponse>((resolve) => {
      this.kiteManager.loadOrders(resolve);
    }).then(async (response) => this.saveGttMap(response));
  }

  /**
   * Reads order parameters from panel
   * @private
   * @returns Order parameters
   */
  private readOrderPanel(): { qty: number; sl: number; ent: number; tp: number } {
    const ent = parseFloat($(Constants.DOM.ORDER_PANEL.INPUTS.ENTRY_PRICE).val() as string);
    const tp = parseFloat($(Constants.DOM.ORDER_PANEL.INPUTS.PROFIT_PRICE).val() as string);
    const sl = parseFloat($(Constants.DOM.ORDER_PANEL.INPUTS.STOP_PRICE).val() as string);

    const compute = this.calculateQuantity(ent, sl);

    const confirmedQty = prompt(
      `Qty (2X): ${compute.qty} (${compute.doubleQty}) RiskLimit: ${Constants.TRADING.ORDER.RISK_LIMIT} TradeRisk: ${compute.risk}`,
      compute.qty.toString()
    );

    return {
      qty: parseInt(confirmedQty || '0'),
      sl,
      ent,
      tp,
    };
  }

  /**
   * Calculates the quantity based on entry price, stop price, and risk limit.
   * @param ent Entry price
   * @param sl Stop price
   * @returns Calculated quantity
   */
  public calculateQuantity(ent: number, sl: number): { risk: number; qty: number; doubleQty: number } {
    const risk = parseFloat((ent - sl).toFixed(2));
    const qty = Math.round(Constants.TRADING.ORDER.RISK_LIMIT / risk);
    const doubleQty = Math.round((Constants.TRADING.ORDER.RISK_LIMIT * 2) / risk);
    return { risk, qty, doubleQty };
  }

  /**
   * Validates order parameters
   * @private
   * @param order - Order parameters
   * @returns True if valid
   */
  private validateOrder(order: GttCreateEvent): boolean {
    return !!(
      order.qty &&
      order.qty > 0 &&
      order.sl &&
      order.sl > 0 &&
      order.ent &&
      order.ent > 0 &&
      order.tp &&
      order.tp > 0
    );
  }

  /**
   * Closes the order panel
   * @private
   */
  private closeOrderPanel(): void {
    $(Constants.DOM.ORDER_PANEL.CLOSE).click();
  }

  /**
   * Displays order message
   * @private
   * @param order - Order details
   */
  private displayOrderMessage(order: GttCreateEvent): void {
    Notifier.yellow(
      `🚀 ${order.symb} (${order.ltp}), Qty ${order.qty}, SL:ENT:TP: ${order.sl} - ${order.ent} - ${order.tp}`
    );
  }

  /**
   * Gets button configuration for order display
   * @private
   * @param order - Order details
   * @returns Button configuration
   */
  private getOrderButtonConfig(order: Order): ButtonConfig {
    const orderTypeShort = order.type.includes('single') ? 'B' : 'SL';
    //Extract Buy Price for Single order and Target for Two Legged
    const triggerPrice = order.type.includes('single') ? order.prices[0] : order.prices[1];
    const lastTradedPrice = this.tvManager.getLastTradedPrice();
    const priceDifferencePercent = Math.abs(triggerPrice - lastTradedPrice) / lastTradedPrice;
    // Color Code far Trigger to yellow (if difference is more than 20%)
    const buttonColor = priceDifferencePercent > 0.2 ? 'yellow' : 'lime';
    return {
      text: `${orderTypeShort}-${order.qty} (${triggerPrice})`,
      color: buttonColor,
    };
  }

  /**
   * Creates an order button with given configuration
   * @private
   * @param config - Button configuration
   * @returns Button element
   */
  private createOrderButton(config: ButtonConfig): JQuery {
    const $button = this.uiUtil
      .buildButton('', config.text, () => {
        this.handleDeleteOrderButton($button);
      })
      .css('color', config.color);
    return $button;
  }
}
