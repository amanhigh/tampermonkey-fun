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

    /**
     * Handles alert click events.
     * @param {Object} event - Event containing InvestingTicker or TvTicker
     */
    handleAlertClick(event) {
        if (event.InvestingTicker) {
            pinInvestingTicker(getTicker(), event.InvestingTicker);
            return;
        }

        if (event.TvTicker) {
            OpenTicker(event.TvTicker);
        }
    }

    /**
     * Registers handler for alert deletion
     * @param {Function} handler - Callback function for alert deletion
     */
    registerDeleteAlertHandler(handler) {
        this.deleteAlertHandler = handler;
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
        return buildButton("", displayInfo, () => {
            if (this.deleteAlertHandler) {
                this.deleteAlertHandler(alert);
            } else {
                console.warn('Delete alert handler not registered');
            }
        }).data('alt', alert);
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

