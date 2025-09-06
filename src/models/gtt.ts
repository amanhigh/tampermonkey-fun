import { BaseEvent } from './events';
import { Order } from './kite';

/**
 * Event for creating new GTT orders
 * Handles order creation parameters including symbol, quantity, and price levels
 */
export class GttCreateEvent extends BaseEvent {
  symb: string;
  qty: number;
  ltp: number;
  sl: number;
  ent: number;
  tp: number;

  /**
   * Creates a new GTT Create Event
   * @param symb Trading symbol
   * @param qty Order quantity
   * @param ltp Last traded price
   * @param sl Stop loss price
   * @param ent Entry price
   * @param tp Target price
   */
  constructor(symb: string, qty: number, ltp: number, sl: number, ent: number, tp: number) {
    super();
    this.symb = symb;
    this.qty = qty;
    this.ltp = ltp;
    this.sl = sl;
    this.ent = ent;
    this.tp = tp;
  }

  /**
   * Validates if all required fields are present
   * @returns true if event has all required fields
   */
  public isValid(): boolean {
    return !!(this.symb && this.qty && this.ltp && this.sl && this.ent && this.tp);
  }

  /**
   * Create GttCreateEvent from serialized string
   * @param data Serialized event data
   * @returns New GttCreateEvent instance
   */
  public static fromString(data: string): GttCreateEvent {
    const parsed = JSON.parse(data);
    return new GttCreateEvent(parsed.symb, parsed.qty, parsed.ltp, parsed.sl, parsed.ent, parsed.tp);
  }
}

/**
 * Event for refreshing GTT orders
 * Maintains a map of active GTT orders by symbol
 */
export class GttRefreshEvent extends BaseEvent {
  orders: Record<string, Order[]>;
  time: number;

  /**
   * Creates a new GTT Refresh Event
   */
  constructor() {
    super();
    this.orders = {};
    this.time = Date.now();
  }

  /**
   * Adds an order for a symbol
   * @param sym Trading symbol
   * @param leg Order to add
   */
  addOrder(sym: string, leg: Order): void {
    if (!this.orders[sym]) {
      this.orders[sym] = [];
    }
    this.orders[sym].push(leg);
  }

  /**
   * Gets all orders for a ticker symbol
   * @param ticker Trading symbol to lookup
   * @returns Array of orders for the symbol
   */
  getOrdersForTicker(ticker: string): Order[] {
    return this.orders[ticker] || [];
  }

  /**
   * Gets total count of symbols with orders
   * @returns Number of symbols that have orders
   */
  getCount(): number {
    return Object.keys(this.orders).length;
  }

  /**
   * Create GttRefreshEvent from serialized string
   * @param data Serialized event data
   * @returns New GttRefreshEvent instance
   */
  public static fromString(data: string): GttRefreshEvent {
    const parsed = JSON.parse(data);
    const event = new GttRefreshEvent();
    event.orders = parsed.orders;
    event.time = parsed.time;
    return event;
  }
}

/**
 * GTT API Response data format
 */
export class GttDeleteEvent extends BaseEvent {
  readonly orderId: string;
  readonly symbol: string;

  constructor(orderId: string, symbol: string) {
    super();
    this.orderId = orderId;
    this.symbol = symbol;
  }

  /**
   * Create GttCreateEvent from serialized string
   * @param data Serialized event data
   * @returns New GttCreateEvent instance
   */
  public static fromString(data: string): GttDeleteEvent {
    const parsed = JSON.parse(data);
    return new GttDeleteEvent(parsed.orderId, parsed.symbol);
  }
}
