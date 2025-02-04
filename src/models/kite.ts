/* eslint-disable max-params */
import { BaseEvent } from './events';

/**
 * Base class for all Kite order related entities
 * Encapsulates common order attributes
 */
export abstract class BaseKiteOrder {
  sym: string;
  qty: number;

  /**
   * Creates a new BaseKiteOrder instance
   * @param sym Trading symbol
   * @param qty Order quantity
   */
  constructor(sym: string, qty: number) {
    this.sym = sym;
    this.qty = qty;
  }
}

/**
 * Represents a GTT order with symbol, quantity, type, and price information
 */
export class Order extends BaseKiteOrder {
  type: string;
  id: string;
  prices: number[];

  /**
   * Creates a new Order instance
   * @param sym Trading symbol for the order
   * @param qty Order quantity
   * @param type Order type (e.g., 'single', 'two-leg')
   * @param id Unique order identifier
   * @param prices Array of trigger prices for the order
   */
  constructor(sym: string, qty: number, type: string, id: string, prices: number[]) {
    super(sym, qty);
    this.type = type;
    this.id = id;
    this.prices = prices;
  }
}

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
 * Order details for creating GTT orders
 */
interface GttRequestOrder {
  exchange: string;
  tradingsymbol: string;
  transaction_type: string;
  quantity: number;
  price: number;
  order_type: string;
  product: string;
}

/**
 * GTT order body for API requests
 */
export class CreateGttRequest extends BaseEvent {
  readonly condition: {
    exchange: string;
    tradingsymbol: string;
    trigger_values: number[];
    last_price: number;
  };
  readonly orders: GttRequestOrder[];
  readonly type: string;
  readonly expires_at: string;

  /**
   * Creates a GTT order body with condition and orders
   * @param tradingsymbol Trading symbol for the order
   * @param triggers Array of trigger prices
   * @param lastPrice Last traded price
   * @param orders Array of order details
   * @param type Order type (single/two-leg)
   * @param expiryDate Order expiry date
   */
  constructor(
    tradingsymbol: string,
    triggers: number[],
    lastPrice: number,
    orders: GttRequestOrder[],
    type: string,
    expiryDate: string
  ) {
    super();
    if (!tradingsymbol || !triggers.length || !orders.length) {
      throw new Error('Invalid GTT request parameters');
    }

    this.condition = {
      exchange: 'NSE',
      tradingsymbol,
      trigger_values: triggers,
      last_price: lastPrice,
    };
    this.orders = orders;
    this.type = type;
    this.expires_at = expiryDate;
  }

  /**
   * Encodes request data into URL-encoded format for API submission
   * @returns URL-encoded string representation of the request
   */
  public encode(): string {
    const params = new URLSearchParams();

    // Encode condition object
    params.append('condition', JSON.stringify(this.condition));

    // Encode orders array
    params.append('orders', JSON.stringify(this.orders));

    // Encode type and expires_at
    params.append('type', this.type);
    params.append('expires_at', this.expires_at);

    return params.toString();
  }
}

/**
 * GTT API Response order details
 */
export interface GttApiOrder {
  tradingsymbol: string;
  quantity: number;
}

/**
 * GTT API Response condition details
 */
export interface GttApiCondition {
  trigger_values: number[];
}

/**
 * Single GTT order entry in API response
 */
export interface GttApiData {
  status: string;
  orders: GttApiOrder[];
  type: string;
  id: string;
  condition: GttApiCondition;
}

/**
 * GTT API Response data format
 */
export class GttDeleteEvent extends BaseEvent {
  // TODO: Reorganize Models
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

export interface GttApiResponse {
  data: GttApiData[];
}
