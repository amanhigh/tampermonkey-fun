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
   * Serialize event to JSON string for storage
   * @returns JSON string with order creation parameters
   */
  public stringify(): string {
    return JSON.stringify({
      symb: this.symb,
      qty: this.qty,
      ltp: this.ltp,
      sl: this.sl,
      ent: this.ent,
      tp: this.tp,
    });
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
  private _orders: Record<string, Order[]>;

  /**
   * Creates a new GTT Refresh Event
   */
  constructor() {
    super();
    this._orders = {};
  }

  /**
   * Adds an order for a symbol
   * @param sym Trading symbol
   * @param leg Order to add
   */
  addOrder(sym: string, leg: Order): void {
    if (!this._orders[sym]) {
      this._orders[sym] = [];
    }
    this._orders[sym].push(leg);
  }

  /**
   * Gets all orders for a ticker symbol
   * @param ticker Trading symbol to lookup
   * @returns Array of orders for the symbol
   */
  getOrdersForTicker(ticker: string): Order[] {
    return this._orders[ticker] || [];
  }

  /**
   * Gets total count of symbols with orders
   * @returns Number of symbols that have orders
   */
  getCount(): number {
    return Object.keys(this._orders).length;
  }

  /**
   * Create GttRefreshEvent from serialized string
   * @param data Serialized event data
   * @returns New GttRefreshEvent instance
   */
  public static fromString(data: string | undefined): GttRefreshEvent {
    if (!data) {
      return new GttRefreshEvent();
    }
    try {
      const parsed = JSON.parse(data);
      const event = new GttRefreshEvent();
      if (parsed.orders && typeof parsed.orders === 'object') {
        // Reconstruct orders from parsed data
        Object.entries(parsed.orders).forEach(([sym, orders]) => {
          (orders as Order[]).forEach((order) => {
            event.addOrder(sym, order);
          });
        });
      }
      return event;
    } catch (error) {
      console.error('Failed to parse GttRefreshEvent:', error);
      return new GttRefreshEvent();
    }
  }

  /**
   * Serialize event to JSON string for storage
   * @returns JSON string with orders map
   */
  public stringify(): string {
    return JSON.stringify({
      orders: this._orders,
    });
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
export class CreateGttRequest {
  private readonly _condition: {
    exchange: string;
    tradingsymbol: string;
    trigger_values: number[];
    last_price: number;
  };
  private readonly _orders: GttRequestOrder[];
  private readonly _type: string;
  private readonly _expires_at: string;

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
    if (!tradingsymbol || !triggers.length || !orders.length) {
      throw new Error('Invalid GTT request parameters');
    }

    this._condition = {
      exchange: 'NSE',
      tradingsymbol,
      trigger_values: triggers,
      last_price: lastPrice,
    };
    this._orders = orders;
    this._type = type;
    this._expires_at = expiryDate;
  }

  /**
   * Gets the complete order body for API request
   */
  toRequestBody(): string {
    return JSON.stringify({
      condition: this._condition,
      orders: this._orders,
      type: this._type,
      expires_at: this._expires_at,
    });
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
  private readonly _orderId: string;
  private readonly _symbol: string;

  constructor(orderId: string, symbol: string) {
    super();
    this._orderId = orderId;
    this._symbol = symbol;
  }

  get orderId(): string {
    return this._orderId;
  }

  get symbol(): string {
    return this._symbol;
  }

  public stringify(): string {
    return JSON.stringify({
      orderId: this._orderId,
      symbol: this._symbol,
    });
  }
}

export interface GttApiResponse {
  data: GttApiData[];
}
