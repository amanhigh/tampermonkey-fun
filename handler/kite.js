/**
 * Handles Kite platform events and UI interactions
 * @class KiteHandler
 */
class KiteHandler {
    /**
     * GTT tab selector
     * @private
     * @type {string}
     */
    _gttSelector = '.router-link-exact-active';

    /**
     * @param {KiteManager} kiteManager
     * @param {SymbolManager} symbolManager
     */
    constructor(kiteManager, symbolManager) {
        this._kiteManager = kiteManager;
        this._symbolManager = symbolManager;
    }

    /**
     * Initializes Kite event handlers
     */
    initialize() {
        this._setupGttOrderListener();
        this._setupGttTabListener();
        this._setupOrderPanelListeners();
    }

    /**
     * Handles GTT request events
     * @param {Object} request - The GTT request object
     * @param {string} request.symb - Symbol
     * @param {number} request.qty - Quantity
     * @param {number} request.ltp - Last traded price
     * @param {number} request.sl - Stop loss
     * @param {number} request.ent - Entry price
     * @param {number} request.tp - Take profit
     * @param {string} [request.id] - GTT ID for deletion
     */
    handleGttRequest(request) {
        if (request.qty > 0) {
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

    /**
     * Handles GTT order button click
     */
    handleGttOrderButton() {
        const order = this._readOrderPanel();
        
        // Build request object in expected format
        // TODO: override order symb, ltp
        const request = {
            symb: getTicker(),
            ltp: getLastTradedPrice(),
            qty: order.qty,
            sl: order.sl,
            ent: order.ent,
            tp: order.tp
        };

        if (this._validateOrder(request)) {
            this._displayOrderMessage(request);
            GM_setValue(gttRequest, request);
            this._closeOrderPanel();
        } else {
            alert("Invalid GTT Input");
        }
    }

    /**
     * Handles delete order button click
     * @param {Event} evt Click event
     */
    handleDeleteOrderButton(evt) {
        const request = {
            id: $(evt.currentTarget).data('order-id')
        };
        GM_setValue(gttRequest, request);
        message(`GTT Delete: ${request.id}`, 'red');
    }

    /**
     * Generates a summary of the GTT orders for a given ticker
     * in Info Area.
     *
     * @param {GttOrderMap} gttOrderMap - The object containing the GTT orders.
     * @return {undefined} This function does not return a value.
     */
    function gttSummary(gttOrderMap) {
        const currentTicker = getTicker();
        const ordersForTicker = gttOrderMap.getOrdersForTicker(currentTicker);
        const $ordersContainer = $(`#${Constants.UI.IDS.AREAS.ORDERS}`);
        
        $ordersContainer.empty();
        
        if (ordersForTicker.length === 0) return;

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
     * @param {Object} gttResponse - The response object from the GTT API
     * @private
     */
    _saveGttMap(gttResponse) {
        let gttOrder = new GttOrderMap();
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
            GM_setValue(gttOrderEvent, gttOrder);
            message(`GTT Map Built. Count: ${length}`, 'green');
        } else {
            message('GttMap Empty Not Storing', 'red');
        }
    }

    /**
     * Sets up GTT order change listener
     * @private
     */
    _setupGttOrderListener() {
        GM_addValueChangeListener(gttRequest, (keyName, oldValue, newValue) => {
            this.handleGttRequest(newValue);
        });
    }

    /**
     * Sets up GTT tab refresh listener
     * @private
     */
    _setupGttTabListener() {
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
    _setupOrderPanelListeners() {
        $(Constants.SELECTORS.ORDER_PANEL.GTT_BUTTON).click(() => 
            this.handleGttOrderButton());
    }

    /**
     * Reads order parameters from panel
     * @private
     * @returns {Object} Order parameters
     */
    _readOrderPanel() {
        const ent = parseFloat($('input[data-property-id="Risk/RewardlongEntryPrice"]').val());
        const tp = parseFloat($('input[data-property-id="Risk/RewardlongProfitLevelPrice"]').val());
        const sl = parseFloat($('input[data-property-id="Risk/RewardlongStopLevelPrice"]').val());

        const risk = (ent - sl).toFixed(2);
        const qty = Math.round(Constants.TRADING.ORDER.RISK_LIMIT / risk);
        const doubleQty = Math.round((Constants.TRADING.ORDER.RISK_LIMIT * 2) / risk);

        const confirmedQty = prompt(
            `Qty (2X): ${qty} (${doubleQty}) RiskLimit: ${Constants.TRADING.ORDER.RISK_LIMIT} TradeRisk: ${risk}`, 
            qty
        );

        // TODO: Use Models
        return { qty: confirmedQty, sl, ent, tp };
    }

    /**
     * Validates order parameters
     * @private
     * @param {Object} order Order parameters
     * @returns {boolean} True if valid
     */
    _validateOrder(order) {
        return order.qty > 0 && order.sl > 0 && order.ent > 0 && order.tp > 0;
    }

    /**
     * Closes the order panel
     * @private
     */
    _closeOrderPanel() {
        $(Constants.SELECTORS.ORDER_PANEL.CLOSE).click();
    }

    /**
     * Displays order message
     * @private
     * @param {Object} order Order details
     */
    _displayOrderMessage(order) {
        message(
            `${order.symb} (${order.ltp}), Qty ${order.qty}, SL:ENT:TP: ${order.sl} - ${order.ent} - ${order.tp}`,
            'yellow'
        );
    }

    /**
     * Gets button configuration for order display
     * @private
     * @param {Object} order Order details
     * @returns {Object} Button configuration
     */
    _getOrderButtonConfig(order) {
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
     * @param {Object} config Button configuration
     * @returns {jQuery} Button element
     */
    _createOrderButton(config) {
        return buildButton(
            "", 
            config.text.fontcolor(config.color),
            (evt) => this.handleDeleteOrderButton(evt)
        );
    }
}