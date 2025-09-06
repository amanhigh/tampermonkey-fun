import { ISymbolManager } from './symbol';
import { IKiteClient } from '../client/kite';
import { CreateGttRequest, GttApiResponse } from '../models/kite';
import { GttCreateEvent, GttRefreshEvent, GttDeleteEvent } from '../models/gtt';
import { IKiteRepo } from '../repo/kite';
import { IWatchManager } from './watch';

/**
 * Interface for managing Kite trading platform operations
 */
export interface IKiteManager {
  /**
   * Creates a GTT order from the event
   * @param event GTT order creation event
   */
  createOrder(event: GttCreateEvent): Promise<void>;

  /**
   * Creates GTT delete event and stores in repo
   * @param orderId Order ID to delete
   * @param symbol Trading symbol for the order
   */
  createGttDeleteEvent(orderId: string, symbol: string): Promise<void>;

  /**
   * Deletes a GTT order by ID
   * @param gttId The GTT order ID to delete
   */
  deleteOrder(gttId: string): void;

  /**
   * Loads GTT orders and processes them with the provided callback
   * @param callback Callback to process loaded GTT data
   */
  loadOrders(callback: (data: GttApiResponse) => void): void;

  createGttOrderEvent(event: GttCreateEvent): Promise<void>;
  createGttRefreshEvent(event: GttRefreshEvent): Promise<void>;
  getGttRefereshEvent(): Promise<GttRefreshEvent>;

  /**
   * Returns GTT tickers that are not in first or second watchlist
   * @param gttRefreshEvent Current GTT refresh event
   * @returns Array of unwatched ticker symbols
   */
  getUnwatchedGttTickers(gttRefreshEvent: GttRefreshEvent): string[];
}

/**
 * Manages Kite trading platform operations
 */
export class KiteManager implements IKiteManager {
  async getGttRefereshEvent(): Promise<GttRefreshEvent> {
    return await this.kiteRepo.getGttRefereshEvent();
  }

  /** @inheritdoc */
  getUnwatchedGttTickers(gttRefreshEvent: GttRefreshEvent): string[] {
    const allGttTickers = Object.keys(gttRefreshEvent.orders);
    const firstList = this.watchManager.getCategory(0); // Orange list
    const secondList = this.watchManager.getCategory(1); // Red list
    const runningTradesList = this.watchManager.getCategory(4); // Lime list - Running trades

    return allGttTickers.filter(
      (ticker) => !firstList.has(ticker) && !secondList.has(ticker) && !runningTradesList.has(ticker)
    );
  }

  public async createGttDeleteEvent(orderId: string, symbol: string): Promise<void> {
    const deleteEvent = new GttDeleteEvent(orderId, symbol);
    await this.kiteRepo.createGttDeleteEvent(deleteEvent);
  }

  /**
   * Trading price margin
   * @private
   */
  private readonly margin = 0.005;

  /**
   * @param symbolManager Manager for symbol operations
   * @param kiteClient Client for Kite API operations
   * @param kiteRepo Repository for Kite data persistence
   * @param watchManager Manager for watchlist operations
   */
  constructor(
    private readonly symbolManager: ISymbolManager,
    private readonly kiteClient: IKiteClient,
    private readonly kiteRepo: IKiteRepo,
    private readonly watchManager: IWatchManager
  ) {}

  /** @inheritdoc */
  async createOrder(evt: GttCreateEvent): Promise<void> {
    if (!evt.isValid()) {
      throw new Error('Invalid GTT event parameters');
    }

    const exp = this.generateExpiryDate();
    if (!evt.symb) {
      throw new Error('Missing symbol in GTT event');
    }
    const pair = encodeURIComponent(this.symbolManager.tvToKite(evt.symb));

    const buyRequest = this.buildBuyOrderRequest(pair, evt, exp);
    const ocoRequest = this.buildOcoOrderRequest(pair, evt, exp);

    await this.kiteClient.createGTT(ocoRequest);
    // Create Sell Orders before Buy
    await this.kiteClient.createGTT(buyRequest);
  }

  /** @inheritdoc */
  deleteOrder(gttId: string): void {
    void this.kiteClient.deleteGTT(gttId);
  }

  /** @inheritdoc */
  loadOrders(callback: (data: GttApiResponse) => void): void {
    void this.kiteClient.loadGTT(callback);
  }

  async createGttOrderEvent(event: GttCreateEvent): Promise<void> {
    await this.kiteRepo.createGttOrderEvent(event);
  }

  async createGttRefreshEvent(event: GttRefreshEvent): Promise<void> {
    await this.kiteRepo.createGttRefreshEvent(event);
  }

  /**
   * Builds buy order request
   * @private
   */
  private buildBuyOrderRequest(pair: string, event: GttCreateEvent, expiry: string): CreateGttRequest {
    if (!event.ent || !event.qty || !event.ltp) {
      throw new Error('Invalid event parameters for buy order');
    }

    const price = this.generateTick(event.ent + this.margin * event.ent);

    return new CreateGttRequest(
      pair,
      [event.ent],
      event.ltp,
      [
        {
          exchange: 'NSE',
          tradingsymbol: pair,
          transaction_type: 'BUY',
          quantity: event.qty,
          price: parseFloat(price),
          order_type: 'LIMIT',
          product: 'CNC',
        },
      ],
      'single',
      expiry
    );
  }

  /**
   * Builds OCO (one-cancels-other) order request
   * @private
   */
  private buildOcoOrderRequest(pair: string, event: GttCreateEvent, expiry: string): CreateGttRequest {
    if (!event.sl || !event.tp || !event.qty || !event.ltp) {
      throw new Error('Invalid event parameters for OCO order');
    }

    const ltpTrigger = this.generateTick(event.ltp + 0.03 * event.ltp);
    // Choose LTP Trigger If Price to close to TP
    const tpTrigger = event.tp < parseFloat(ltpTrigger) ? ltpTrigger : event.tp.toString();

    const sl = this.generateTick(event.sl - this.margin * event.sl);
    const tp = this.generateTick(parseFloat(tpTrigger) - this.margin * parseFloat(tpTrigger));

    return new CreateGttRequest(
      pair,
      [event.sl, parseFloat(tpTrigger)],
      event.ltp,
      [
        {
          exchange: 'NSE',
          tradingsymbol: pair,
          transaction_type: 'SELL',
          quantity: event.qty,
          price: parseFloat(sl),
          order_type: 'LIMIT',
          product: 'CNC',
        },
        {
          exchange: 'NSE',
          tradingsymbol: pair,
          transaction_type: 'SELL',
          quantity: event.qty,
          price: parseFloat(tp),
          order_type: 'LIMIT',
          product: 'CNC',
        },
      ],
      'two-leg',
      expiry
    );
  }

  /**
   * Generates a tick value based on the input number
   * @param price Current Price
   * @private
   * @returns The generated tick value with two decimal places
   */
  private generateTick(price: number): string {
    return (Math.ceil(price * 20) / 20).toFixed(2);
  }

  /**
   * Generates expiry date one year from now
   * @private
   * @returns Formatted expiry date
   */
  private generateExpiryDate(): string {
    const date = new Date();
    const year = date.getFullYear() + 1;
    const month = date.getMonth();
    const day = date.getDate();
    return `${year}-${month}-${day} 00:00:00`;
  }
}
