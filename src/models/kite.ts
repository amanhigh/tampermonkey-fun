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
 * GTT order type — single-leg buy or two-leg OCO (stop + target)
 */
export enum OrderType {
  SINGLE = 'single',
  TWO_LEG = 'two-leg',
}

/**
 * Represents a GTT order with symbol, quantity, type, and price information
 */
export class Order extends BaseKiteOrder {
  type: OrderType;
  id: string;
  prices: number[];

  /**
   * Creates a new Order instance
   * @param sym Trading symbol for the order
   * @param qty Order quantity
   * @param type Order type (single-leg buy or two-leg OCO)
   * @param id Unique order identifier
   * @param prices Array of trigger prices for the order
   */
  constructor(sym: string, qty: number, type: OrderType, id: string, prices: number[]) {
    super(sym, qty);
    this.type = type;
    this.id = id;
    this.prices = prices;
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
  type: OrderType;
  id: string;
  condition: GttApiCondition;
}

export interface GttApiResponse {
  data: GttApiData[];
}
