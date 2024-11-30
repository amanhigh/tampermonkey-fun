/**
 * Class representing the Alert Manager.
 */
class AlertManager {
    /**
     * Creates an instance of AlertManager.
     * @param {Object} alertStore - The store for managing alerts.
     * @param {AlertUIManager} uiManager - The UI manager instance.
     */
    constructor(alertStore, uiManager) {
        this.alertStore = alertStore;
        this.uiManager = uiManager;
        this.uiManager.registerDeleteAlertHandler(this._deleteAlert.bind(this));
    }

    /********** Public Methods **********/

    /**
     * Refreshes local alerts and updates UI.
     */
    refreshLocalAlerts() {
        waitOn('alert-refresh-local', 10, () => {
            const alerts = this._loadCachedAlerts();
            this.uiManager.displayAlerts(alerts);
            //TODO: Audit Current
        });
    }

    /**
     * Forces a refresh of all alerts from server.
     */
    forceRefreshAlerts() {
        getAllAlerts(this._onForceRefresh.bind(this));
    }

    /********** Private Methods **********/
    /**
     * Handles force refresh response.
     * @param {Object} data - Alert data from server
     * @private
     */
    _onForceRefresh(data) {
        const count = this.alertStore.load(data);
        message(`Alerts Loaded: ${count}`);
        this.refreshLocalAlerts();
        // TODO: Audit All
    }

    /**
     * Handles alert creation for pair info.
     * @param {Object} pairInfo - Pair information
     * @param {number} price - Alert price
     * @private
     */
    _createAlertForPair(pairInfo, price) {
        createAlert(pairInfo.name, pairInfo.pairId, price, (alert) => {
            this.refreshLocalAlerts();
            message(`Alert created at ${price}`, 'green');
            // TODO Extract Hook
        });
    }

    /**
     * Handles alert creation callback.
     * @param {string} name - Alert name
     * @param {string} pairId - Pair identifier
     * @param {number} price - Alert price
     * @private
     */
    _onAlertCreate(name, pairId, price) {
        const ltp = getLastTradedPrice();
        const color = ltp > price ? 'red' : 'green';

        message(`<span style="color: ${color};">Alert: ${name} = ${price}</span>`);

        this.alertStore.addAlert(pairId, new Alert(pairId, price));
        this.refreshLocalAlerts();
    }
}