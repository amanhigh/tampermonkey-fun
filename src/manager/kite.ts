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
   * NSE Cash Segment tick size configuration (April 15, 2025)
   * @private
   */
  private readonly CASH_SEGMENT_TICK_CONFIG = [
    { priceThreshold: 250, tickSize: 0.01 },
    { priceThreshold: 1000, tickSize: 0.05 },
    { priceThreshold: 5000, tickSize: 0.1 },
    { priceThreshold: 10000, tickSize: 0.5 },
    { priceThreshold: 20000, tickSize: 1.0 },
    { priceThreshold: Infinity, tickSize: 5.0 },
  ] as const;

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
   * Generates tick value compliant with NSE Cash Segment regulations (April 15, 2025)
   *
   * Price ranges and corresponding tick sizes:
   * - Below ₹250: 0.01 tick
   * - ₹250-₹1000: 0.05 tick
   * - ₹1000-₹5000: 0.10 tick
   * - ₹5000-₹10000: 0.50 tick
   * - ₹10000-₹20000: 1.00 tick
   * - Above ₹20000: 5.00 tick
   *
   * @param price Current price to apply tick size to
   * @private
   * @returns Tick-adjusted price with appropriate decimal places
   * @throws Error if price is not a valid number
   */
  private generateTick(price: number): string {
    if (typeof price !== 'number' || isNaN(price)) {
      throw new Error(`Invalid price for tick calculation: ${price}`);
    }

    const tickSize = this.getCashSegmentTickSize(price);
    const multiplier = 1 / tickSize;
    const tickedPrice = Math.ceil(price * multiplier) / multiplier;

    // Recalculate decimal places based on the final price's tick size
    // This handles cases where rounding crosses price range boundaries
    const finalTickSize = this.getCashSegmentTickSize(tickedPrice);
    const decimalPlaces = this.getDecimalPlaces(finalTickSize);

    return tickedPrice.toFixed(decimalPlaces);
  }

  /**
   * Determines tick size based on price level for Cash Segment per NSE regulations
   * @param price Current price to evaluate
   * @private
   * @returns Appropriate tick size for the given price range
   */
  private getCashSegmentTickSize(price: number): number {
    const config = this.CASH_SEGMENT_TICK_CONFIG.find((range) => price < range.priceThreshold);
    return config?.tickSize ?? this.CASH_SEGMENT_TICK_CONFIG[this.CASH_SEGMENT_TICK_CONFIG.length - 1].tickSize;
  }

  /**
   * Determines appropriate decimal places for price formatting based on tick size
   *
   * Formatting rules:
   * - Tick ≥ 1.00: No decimals (e.g., "15001")
   * - Tick ≥ 0.10: One decimal (e.g., "1500.1")
   * - Tick < 0.10: Two decimals (e.g., "250.05")
   *
   * @param tickSize The tick size value
   * @private
   * @returns Number of decimal places for formatting
   */
  private getDecimalPlaces(tickSize: number): number {
    if (tickSize >= 1) return 0;
    if (tickSize >= 0.1) return 1;
    return 2;
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
