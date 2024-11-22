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
     */
    constructor(kiteManager) {
        this._kiteManager = kiteManager;
    }

    /**
     * Initializes Kite event handlers
     */
    initialize() {
        this._setupGttOrderListener();
        this._setupGttTabListener();
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
                this._kiteManager.loadOrders(saveMap);
            }, 1000));
        });
    }
}