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
     * Loads cached alerts for current ticker.
     * @returns {Array} Array of alert objects
     * @private
     */
    _loadCachedAlerts() {
        const symbol = getMappedTicker();
        const pairInfo = mapInvestingPair(symbol);
        
        if (!pairInfo) {
            return [];
        }

        return this.alertStore.getSortedAlerts(pairInfo.pairId);
    }

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
}

/**
 * Class representing the Alert UI Manager.
 */
class AlertUIManager {
    /**
     * Creates an instance of AlertUIManager.
     * @param {string} alertsId - The ID of alerts container element
     */
    constructor(alertsId) {
        this.alertsId = alertsId;
    }

    /********** Public Methods **********/

    /**
     * Displays alerts in the UI.
     * @param {Array} alerts - Array of alert objects
     */
    displayAlerts(alerts) {
        const $container = $(`#${this.alertsId}`);
        $container.empty();

        if (!alerts || alerts.length === 0) {
            this._showNoAlertsMessage($container);
            return;
        }

        alerts.forEach(alert => {
            this._createAlertButton(alert).appendTo($container);
        });
    }

    /********** Private Methods **********/

    /**
     * Creates an alert button.
     * @param {Object} alert - Alert object
     * @returns {jQuery} Button element
     * @private
     */
    _createAlertButton(alert) {
        const displayInfo = this._formatAlertDisplay(alert);
        return buildButton("", displayInfo, () => {})
            .data('alt', alert);
    }

    /**
     * Formats alert for display.
     * @param {Object} alert - Alert object
     * @returns {string} Formatted display string
     * @private
     */
    _formatAlertDisplay(alert) {
        const ltp = getLastTradedPrice();
        const percentage = ((alert.Price - ltp) / ltp * 100).toFixed(2);
        const percentageString = percentage >= 0 ? `(+${percentage})` : `(${percentage})`;
        
        const priceString = alert.Price.toString();
        const color = alert.Id === undefined ? 'orange' : 
                     alert.Price < ltp ? 'seagreen' : 'orangered';
        
        return `${priceString.fontcolor(color)} ${percentageString}`;
    }

    /**
     * Shows no alerts message.
     * @param {jQuery} $container - Container element
     * @private
     */
    _showNoAlertsMessage($container) {
        buildLabel("No AlertZ", 'red').appendTo($container);
    }
}