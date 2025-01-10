/* eslint-disable max-params */
import { BaseEvent } from './events';

/**
 * Base class for all Kite order related entities
 * Encapsulates common order attributes
 */
export abstract class BaseKiteOrder {
  protected _sym: string;
  protected _qty: number;

  /**
   * Creates a new BaseKiteOrder instance
   * @param sym Trading symbol
   * @param qty Order quantity
   */
  constructor(sym: string, qty: number) {
    this._sym = sym;
    this._qty = qty;
  }

  get sym(): string {
    return this._sym;
  }
  get qty(): number {
    return this._qty;
  }

  set sym(value: string) {
    this._sym = value;
  }
  set qty(value: number) {
    this._qty = value;
  }
}

/**
 * Represents a GTT order with symbol, quantity, type, and price information
 */
export class Order extends BaseKiteOrder {
  private _type: string;
  private _id: string;
  private _prices: number[];

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
    this._type = type;
    this._id = id;
    this._prices = prices;
  }

  get type(): string {
    return this._type;
  }
  get id(): string {
    return this._id;
  }
  get prices(): number[] {
    return [...this._prices];
  }

  set type(value: string) {
    this._type = value;
  }
  set id(value: string) {
    this._id = value;
  }
  set prices(value: number[]) {
    this._prices = [...value];
  }
}

/**
 * Event for creating new GTT orders
 * Handles order creation parameters including symbol, quantity, and price levels
 */
export class GttCreateEvent extends BaseEvent {
  private _symb?: string;
  private _qty?: number;
  private _ltp?: number;
  private _sl?: number;
  private _ent?: number;
  private _tp?: number;

  /**
   * Creates a new GTT Create Event
   * @param symb Trading symbol
   * @param qty Order quantity
   * @param ltp Last traded price
   * @param sl Stop loss price
   * @param ent Entry price
   * @param tp Target price
   */
  constructor(symb?: string, qty?: number, ltp?: number, sl?: number, ent?: number, tp?: number) {
    super();
    this._symb = symb;
    this._qty = qty;
    this._ltp = ltp;
    this._sl = sl;
    this._ent = ent;
    this._tp = tp;
  }

  get symb(): string | undefined {
    return this._symb;
  }
  get qty(): number | undefined {
    return this._qty;
  }
  get ltp(): number | undefined {
    return this._ltp;
  }
  get sl(): number | undefined {
    return this._sl;
  }
  get ent(): number | undefined {
    return this._ent;
  }
  get tp(): number | undefined {
    return this._tp;
  }

  set symb(value: string | undefined) {
    this._symb = value;
  }
  set qty(value: number | undefined) {
    this._qty = value;
  }
  set ltp(value: number | undefined) {
    this._ltp = value;
  }
  set sl(value: number | undefined) {
    this._sl = value;
  }
  set ent(value: number | undefined) {
    this._ent = value;
  }
  set tp(value: number | undefined) {
    this._tp = value;
  }

  /**
   * Validates if all required fields are present
   * @returns true if event has all required fields
   */
  public isValid(): boolean {
    return !!(this._symb && this._qty && this._ltp && this._sl && this._ent && this._tp);
  }

  /**
   * Serialize event to JSON string for storage
   * @returns JSON string with order creation parameters
   */
  public stringify(): string {
    return JSON.stringify({
      symb: this._symb,
      qty: this._qty,
      ltp: this._ltp,
      sl: this._sl,
      ent: this._ent,
      tp: this._tp,
    });
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
