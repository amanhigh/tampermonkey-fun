/**
 * Manages Kite trading platform operations
 * @class KiteManager
 */
class KiteManager {
    /**
     * Trading price margin
     * @private
     * @type {number}
     */
    _margin = 0.005;

    /**
     * GTT tab selector
     * @private
     * @type {string}
     */
    _gttSelector = '.router-link-exact-active';

    /**
     * Kite client for GTT operations
     * @private
     * @type {KiteClient}
     */
    _kiteClient;

    /**
     * @param {SymbolManager} symbolManager
     * @param {KiteClient} kiteClient
     */
    constructor(symbolManager, kiteClient) {
        this._symbolManager = symbolManager;
        this._kiteClient = kiteClient;
    }

    /**
     * Initializes Kite manager with GTT listeners
     */
    initialize() {
        this._setupGttOrderListener();
        this._setupGttTabListener();
    }

    /**
     * Creates a GTT order with the given parameters
     * @param {string} symbol - The symbol of the order
     * @param {number} ltp - The last traded price of the order
     * @param {number} sl - The stop loss of the order
     * @param {number} ent - The entry price of the order
     * @param {number} tp - The take profit of the order
     * @param {number} qty - The quantity of the order
     */
    createOrder(symbol, ltp, sl, ent, tp, qty) {
        const exp = this._generateExpiryDate();
        const pair = encodeURIComponent(this._symbolManager.tvToKite(symbol));
        
        this._createBuyOrder(pair, ent, qty, ltp, exp);
        this._createOcoOrder(pair, sl, tp, qty, ltp, exp);
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
            this.createOrder(
                request.symb,
                request.ltp,
                request.sl,
                request.ent,
                request.tp,
                request.qty
            );
        } else if (request.id) {
            this._kiteClient.deleteGTT(request.id);
        }
    }

    /**
     * Creates a buy order
     * @private
     * @param {string} pair - The trading symbol pair
     * @param {number} buyTrigger - The buy trigger value
     * @param {number} qty - The quantity to buy
     * @param {number} ltp - The last traded price
     * @param {string} expiry - The expiration time of the order
     */
    _createBuyOrder(pair, buyTrigger, qty, ltp, expiry) {
        const price = this._generateTick(buyTrigger + this._margin * buyTrigger);
        const body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buyTrigger}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${expiry}`;
        this._kiteClient.createGTT(body);
    }

    /**
     * Creates two legged One Cancels Other Orders
     * @private
     * @param {string} pair - Trading symbol pair
     * @param {number} slTrigger - The stopless trigger parameter
     * @param {number} tpTrigger - The target trigger parameter
     * @param {number} qty - Quantity to buy
     * @param {number} ltp - Last traded price
     * @param {string} expiry - Expiration time of the order
     */
    _createOcoOrder(pair, slTrigger, tpTrigger, qty, ltp, expiry) {
        const ltpTrigger = this._generateTick(ltp + 0.03 * ltp);
        // Choose LTP Trigger If Price to close to TP
        tpTrigger = tpTrigger < ltpTrigger ? ltpTrigger : tpTrigger;

        const sl = this._generateTick(slTrigger - this._margin * slTrigger);
        const tp = this._generateTick(tpTrigger - this._margin * tpTrigger);

        const body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${slTrigger},${tpTrigger}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${sl},"order_type":"LIMIT","product":"CNC"},{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${tp},"order_type":"LIMIT","product":"CNC"}]&type=two-leg&expires_at=${expiry}`;
        this._kiteClient.createGTT(body);
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
                this._kiteClient.loadGTT(saveMap);
            }, 1000));
        });
    }

    /**
     * Generates a tick value based on the input number
     * @private
     * @param {number} value - The input number for generating the tick value
     * @returns {string} The generated tick value with two decimal places
     */
    _generateTick(value) {
        return (Math.ceil(value * 20) / 20).toFixed(2);
    }

    /**
     * Generates expiry date one year from now
     * @private
     * @returns {string} Formatted expiry date
     */
    _generateExpiryDate() {
        const date = new Date();
        const year = date.getFullYear() + 1;
        const month = date.getMonth();
        const day = date.getDate();
        return `${year}-${month}-${day} 00:00:00`;
    }
}
