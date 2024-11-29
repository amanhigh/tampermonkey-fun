import { IKiteManager } from '../manager/kite';
import { ISymbolManager } from '../manager/symbol';
import { Constants } from '../models/constant';
import { GttOrderMap, Order } from '../models/gtt';
import { Notifier } from '../util/notify';

/**
 * Structure of a GTT request
 */
interface GttRequest {
    symb?: string;
    qty?: number;
    ltp?: number;
    sl?: number;
    ent?: number;
    tp?: number;
    id?: string;
}

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
    initialize(): void;

    /**
     * Processes GTT request operations
     * @param request The GTT request parameters
     */
    handleGttRequest(request: GttRequest): void;

    /**
     * Handles GTT order button click events
     */
    handleGttOrderButton(): void;

    /**
     * Handles delete order button click events
     * @param evt Click event object
     */
    handleDeleteOrderButton(evt: JQuery.ClickEvent): void;

    /**
     * Generates a summary of GTT orders in the Info Area
     * @param gttOrderMap Object containing GTT orders
     */
    gttSummary(gttOrderMap: GttOrderMap): void;
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
    private readonly _gttSelector = '.router-link-exact-active';

    /**
     * @param kiteManager - Manager for Kite operations
     * @param symbolManager - Manager for symbol operations
     */
    constructor(
        private readonly _kiteManager: IKiteManager,
        private readonly _symbolManager: ISymbolManager
    ) { }

    /** @inheritdoc */
    initialize(): void {
        this._setupGttOrderListener();
        this._setupGttTabListener();
        this._setupOrderPanelListeners();
    }

    /** @inheritdoc */
    handleGttRequest(request: GttRequest): void {
        if (request.qty && request.qty > 0 && request.symb && request.ltp &&
            request.sl && request.ent && request.tp) {
            this._kiteManager.createOrder(
                request.symb,
                request.ltp,
                request.sl,
                request.ent,
                request.tp,
                request.qty
            );
        } else if (request.id) {
            this._kiteManager.deleteOrder(request.id);
        }
    }

    /** @inheritdoc */
    handleGttOrderButton(): void {
        const order = this._readOrderPanel();

        // Build request object in expected format
        // TODO: override order symb, ltp
        const request: GttRequest = {
            symb: getTicker(),
            ltp: getLastTradedPrice(),
            qty: order.qty,
            sl: order.sl,
            ent: order.ent,
            tp: order.tp
        };

        if (this._validateOrder(request)) {
            this._displayOrderMessage(request);
            GM_setValue(Constants.STORAGE.EVENTS.GTT_REFERSH, request);
            this._closeOrderPanel();
        } else {
            alert("Invalid GTT Input");
        }
    }

    /** @inheritdoc */
    handleDeleteOrderButton(evt: JQuery.ClickEvent): void {
        const request: GttRequest = {
            id: $(evt.currentTarget).data('order-id')
        };
        GM_setValue(Constants.STORAGE.EVENTS.GTT_REFERSH, request);
        Notifier.message(`GTT Delete: ${request.id}`, 'red');
    }

    /** @inheritdoc */
    gttSummary(gttOrderMap: GttOrderMap): void {
        const currentTicker = getTicker();
        const ordersForTicker = gttOrderMap.getOrdersForTicker(currentTicker);
        const $ordersContainer = $(`#${Constants.UI.IDS.AREAS.ORDERS}`);

        $ordersContainer.empty();

        if (ordersForTicker.length === 0) {
            return;
        }

        ordersForTicker.reverse().forEach(order => {
            const buttonConfig = this._getOrderButtonConfig(order);
            this._createOrderButton(buttonConfig)
                .data('order-id', order.id)
                .appendTo($ordersContainer);
        });
    }

    /**
     * Generates a map of GTT orders based on the response from the GTT API
     * Generates GTT Order Event in GM Cache
     * @private
     * @param gttResponse - The response object from the GTT API
     */
    private _saveGttMap(gttResponse: {
        data: Array<{
            status: string;
            orders: Array<{ tradingsymbol: string; quantity: number; }>;
            type: string;
            id: string;
            condition: { trigger_values: number[]; };
        }>;
    }): void {
        const gttOrder = new GttOrderMap();
        gttResponse.data.forEach((gtt) => {
            if (gtt.status === "active") {
                const symbol = this._symbolManager.kiteToTv(gtt.orders[0].tradingsymbol);
                const order = new Order(
                    symbol,
                    gtt.orders[0].quantity,
                    gtt.type,
                    gtt.id,
                    gtt.condition.trigger_values
                );
                gttOrder.addOrder(symbol, order);
            }
        });
        const length = gttOrder.getCount();
        if (length > 0) {
            // TODO: Move to Repo
            GM_setValue(Constants.STORAGE.EVENTS.GTT_ORDER, gttOrder);
            Notifier.message(`GTT Map Built. Count: ${length}`, 'green');
        } else {
            Notifier.message('GttMap Empty Not Storing', 'red');
        }
    }

    /**
     * Sets up GTT order change listener
     * @private
     */
    private _setupGttOrderListener(): void {
        GM_addValueChangeListener(
            Constants.STORAGE.EVENTS.GTT_REFERSH,
            (_keyName: string, _oldValue: unknown, newValue: GttRequest) => {
                this.handleGttRequest(newValue);
            }
        );
    }

    /**
     * Sets up GTT tab refresh listener
     * @private
     */
    private _setupGttTabListener(): void {
        waitJEE(this._gttSelector, ($e) => {
            $e.click(() => setTimeout(() => {
                this._kiteManager.loadOrders(response => this._saveGttMap(response));
            }, 1000));
        });
    }

    /**
     * Sets up order panel related listeners
     * @private
     */
    private _setupOrderPanelListeners(): void {
        $(Constants.DOM.ORDER_PANEL.GTT_BUTTON).click(() =>
            this.handleGttOrderButton());
    }

    /**
     * Reads order parameters from panel
     * @private
     * @returns Order parameters
     */
    private _readOrderPanel(): { qty: number; sl: number; ent: number; tp: number; } {
        // TODO: Extract to Constants
        const ent = parseFloat($('input[data-property-id="Risk/RewardlongEntryPrice"]').val() as string);
        const tp = parseFloat($('input[data-property-id="Risk/RewardlongProfitLevelPrice"]').val() as string);
        const sl = parseFloat($('input[data-property-id="Risk/RewardlongStopLevelPrice"]').val() as string);

        const risk = (ent - sl).toFixed(2);
        const qty = Math.round(Constants.TRADING.ORDER.RISK_LIMIT / parseFloat(risk));
        const doubleQty = Math.round((Constants.TRADING.ORDER.RISK_LIMIT * 2) / parseFloat(risk));

        const confirmedQty = prompt(
            `Qty (2X): ${qty} (${doubleQty}) RiskLimit: ${Constants.TRADING.ORDER.RISK_LIMIT} TradeRisk: ${risk}`,
            qty.toString()
        );

        return {
            qty: parseInt(confirmedQty || '0'),
            sl,
            ent,
            tp
        };
    }

    /**
     * Validates order parameters
     * @private
     * @param order - Order parameters
     * @returns True if valid
     */
    private _validateOrder(order: GttRequest): boolean {
        return !!(order.qty && order.qty > 0 &&
            order.sl && order.sl > 0 &&
            order.ent && order.ent > 0 &&
            order.tp && order.tp > 0);
    }

    /**
     * Closes the order panel
     * @private
     */
    private _closeOrderPanel(): void {
        $(Constants.DOM.ORDER_PANEL.CLOSE).click();
    }

    /**
     * Displays order message
     * @private
     * @param order - Order details
     */
    private _displayOrderMessage(order: GttRequest): void {
        Notifier.message(
            `${order.symb} (${order.ltp}), Qty ${order.qty}, SL:ENT:TP: ${order.sl} - ${order.ent} - ${order.tp}`,
            'yellow'
        );
    }

    /**
     * Gets button configuration for order display
     * @private
     * @param order - Order details
     * @returns Button configuration
     */
    private _getOrderButtonConfig(order: Order): ButtonConfig {
        const orderTypeShort = order.type.includes('single') ? "B" : "SL";
        //Extract Buy Price for Single order and Target for Two Legged
        const triggerPrice = order.type.includes('single') ? order.prices[0] : order.prices[1];
        const lastTradedPrice = getLastTradedPrice();
        const priceDifferencePercent = Math.abs(triggerPrice - lastTradedPrice) / lastTradedPrice;
        // Color Code far Trigger to yellow (if difference is more than 20%)
        const buttonColor = priceDifferencePercent > 0.20 ? 'yellow' : 'lime';
        return {
            text: `${orderTypeShort}-${order.qty} (${triggerPrice})`,
            color: buttonColor
        };
    }

    /**
     * Creates an order button with given configuration
     * @private
     * @param config - Button configuration
     * @returns Button element
     */
    private _createOrderButton(config: ButtonConfig): JQuery {
        return buildButton(
            "",
            config.text.fontcolor(config.color),
            (evt: JQuery.ClickEvent) => this.handleDeleteOrderButton(evt)
        );
    }
}
