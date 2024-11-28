import { ISymbolManager } from './symbol';
import { IKiteClient } from '../client/kite';

/**
 * Interface for managing Kite trading platform operations
 */
export interface IKiteManager {
    /**
     * Creates a GTT order with the given parameters
     * @param symbol The symbol of the order
     * @param ltp The last traded price of the order
     * @param sl The stop loss of the order
     * @param ent The entry price of the order
     * @param tp The take profit of the order
     * @param qty The quantity of the order
     */
    createOrder(symbol: string, ltp: number, sl: number, ent: number, tp: number, qty: number): void;

    /**
     * Deletes a GTT order by ID
     * @param gttId The GTT order ID to delete
     */
    deleteOrder(gttId: string): void;

    /**
     * Loads GTT orders and processes them with the provided callback
     * @param callback Callback to process loaded GTT data
     */
    loadOrders(callback: (data: unknown) => void): void;
}

/**
 * Manages Kite trading platform operations
 */
export class KiteManager implements IKiteManager {
    /**
     * Trading price margin
     * @private
     */
    private readonly _margin = 0.005;

    /**
     * @param symbolManager Manager for symbol operations
     * @param kiteClient Client for Kite API operations
     */
    constructor(
        private readonly _symbolManager: ISymbolManager,
        private readonly _kiteClient: IKiteClient
    ) {}

    /** @inheritdoc */
    createOrder(symbol: string, ltp: number, sl: number, ent: number, tp: number, qty: number): void {
        // HACK: Introduce request order object.
        const exp = this._generateExpiryDate();
        const pair = encodeURIComponent(this._symbolManager.tvToKite(symbol));
        
        this._createBuyOrder(pair, ent, qty, ltp, exp);
        this._createOcoOrder(pair, sl, tp, qty, ltp, exp);
    }

    /** @inheritdoc */
    deleteOrder(gttId: string): void {
        void this._kiteClient.deleteGTT(gttId);
    }

    /** @inheritdoc */
    loadOrders(callback: (data: unknown) => void): void {
        // FIXME: Change Unknown data type
        void this._kiteClient.loadGTT(callback);
    }

    /**
     * Creates a buy order
     * @private
     * @param pair The trading symbol pair
     * @param buyTrigger The buy trigger value
     * @param qty The quantity to buy
     * @param ltp The last traded price
     * @param expiry The expiration time of the order
     */
    private _createBuyOrder(pair: string, buyTrigger: number, qty: number, ltp: number, expiry: string): void {
        const price = this._generateTick(buyTrigger + this._margin * buyTrigger);
        // HACK: Better Body Creating ?
        const body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buyTrigger}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${expiry}`;
        void this._kiteClient.createGTT(body);
    }

    /**
     * Creates two legged One Cancels Other Orders
     * @private
     * @param pair Trading symbol pair
     * @param slTrigger The stopless trigger parameter
     * @param tpTrigger The target trigger parameter
     * @param qty Quantity to buy
     * @param ltp Last traded price
     * @param expiry Expiration time of the order
     */
    private _createOcoOrder(pair: string, slTrigger: number, tpTrigger: number, qty: number, ltp: number, expiry: string): void {
        const ltpTrigger = this._generateTick(ltp + 0.03 * ltp);
        // Choose LTP Trigger If Price to close to TP
        tpTrigger = tpTrigger < ltpTrigger ? ltpTrigger : tpTrigger;

        const sl = this._generateTick(slTrigger - this._margin * slTrigger);
        const tp = this._generateTick(tpTrigger - this._margin * tpTrigger);

        const body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${slTrigger},${tpTrigger}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${sl},"order_type":"LIMIT","product":"CNC"},{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${tp},"order_type":"LIMIT","product":"CNC"}]&type=two-leg&expires_at=${expiry}`;
        void this._kiteClient.createGTT(body);
    }

    /**
     * Generates a tick value based on the input number
     * @private
     * @param value The input number for generating the tick value
     * @returns The generated tick value with two decimal places
     */
    private _generateTick(value: number): string {
        return (Math.ceil(value * 20) / 20).toFixed(2);
    }

    /**
     * Generates expiry date one year from now
     * @private
     * @returns Formatted expiry date
     */
    private _generateExpiryDate(): string {
        const date = new Date();
        const year = date.getFullYear() + 1;
        const month = date.getMonth();
        const day = date.getDate();
        return `${year}-${month}-${day} 00:00:00`;
    }
}
