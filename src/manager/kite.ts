import { ISymbolManager } from './symbol';
import { IKiteClient } from '../client/kite';
import { GttCreateEvent, CreateGttRequest } from '../models/kite';

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
    async createOrder(event: GttCreateEvent): Promise<void> {
        if (!event.symb || !event.qty || !event.ltp || !event.sl || !event.ent || !event.tp) {
            throw new Error("Invalid GTT event parameters");
        }

        const exp = this._generateExpiryDate();
        const pair = encodeURIComponent(this._symbolManager.tvToKite(event.symb));
        
        // Create buy order first
        await this._kiteClient.createGTT(this._buildBuyOrderRequest(pair, event, exp));
        // Create OCO order after
        await this._kiteClient.createGTT(this._buildOcoOrderRequest(pair, event, exp));
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
     * Builds buy order request
     * @private
     */
    private _buildBuyOrderRequest(pair: string, event: GttCreateEvent, expiry: string): CreateGttRequest {
        if (!event.ent || !event.qty || !event.ltp) {
            throw new Error("Invalid event parameters for buy order");
        }

        const price = this._generateTick(event.ent + this._margin * event.ent);
        
        return new CreateGttRequest(
            pair,
            [event.ent],
            event.ltp,
            [{
                exchange: "NSE",
                tradingsymbol: pair,
                transaction_type: "BUY",
                quantity: event.qty,
                price: parseFloat(price),
                order_type: "LIMIT",
                product: "CNC"
            }],
            "single",
            expiry
        );
    }

    /**
     * Builds OCO (one-cancels-other) order request
     * @private
     */
    private _buildOcoOrderRequest(pair: string, event: GttCreateEvent, expiry: string): CreateGttRequest {
        if (!event.sl || !event.tp || !event.qty || !event.ltp) {
            throw new Error("Invalid event parameters for OCO order");
        }

        const ltpTrigger = this._generateTick(event.ltp + 0.03 * event.ltp);
        // Choose LTP Trigger If Price to close to TP
        const tpTrigger = event.tp < parseFloat(ltpTrigger) ? ltpTrigger : event.tp.toString();

        const sl = this._generateTick(event.sl - this._margin * event.sl);
        const tp = this._generateTick(parseFloat(tpTrigger) - this._margin * parseFloat(tpTrigger));

        return new CreateGttRequest(
            pair,
            [event.sl, parseFloat(tpTrigger)],
            event.ltp,
            [
                {
                    exchange: "NSE",
                    tradingsymbol: pair,
                    transaction_type: "SELL",
                    quantity: event.qty,
                    price: parseFloat(sl),
                    order_type: "LIMIT",
                    product: "CNC"
                },
                {
                    exchange: "NSE",
                    tradingsymbol: pair,
                    transaction_type: "SELL",
                    quantity: event.qty,
                    price: parseFloat(tp),
                    order_type: "LIMIT",
                    product: "CNC"
                }
            ],
            "two-leg",
            expiry
        );
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
