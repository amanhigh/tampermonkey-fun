/**
 * Handles alert summary display and interactions
 */
class AlertSummaryHandler {
    /**
     * @param {AlertManagerV1} alertManager Alert operations manager
     * @param {TradingViewManager} tradingViewManager Trading view operations
     */
    constructor(alertManager, tradingViewManager) {
        this._alertManager = alertManager;
        this._tradingViewManager = tradingViewManager;
        this._containerId = Constants.AREAS.ALERTS_ID;
    }

    /**
     * Display alerts in summary area
     * @param {Alert[]} alerts Array of alerts to display
     */
    displayAlerts(alerts) {
        const $container = $(`#${this._containerId}`);
        $container.empty();

        if (!alerts || alerts.length === 0) {
            this._showEmptyState($container);
            return;
        }

        alerts.forEach(alert => {
            this._createAlertButton(alert).appendTo($container);
        });
    }

    /**
     * @private
     * Creates delete button for alert
     * @param {Alert} alert Alert to create button for
     * @returns {jQuery} Button element
     */
    _createAlertButton(alert) {
        // TODO: Replace buildButton with UI component system
        const displayText = this._formatAlertDisplay(alert);
        return buildButton("", displayText, () => {
            try {
                // TODO: Delete Button with alert
                this._alertManager.deleteAlertById(alert.PairId, alert.Id);
                // TODO: Extract Message System
                message(`Alert deleted: ${alert.Price}`, 'green');
            } catch (error) {
                message(error.message, 'red');
            }
            // FIXME: Add Alert Id to Button for deletion ?
        });
    }

    /**
     * @private
     * Formats alert display text with color
     * @param {Alert} alert Alert to format
     * @returns {string} Formatted HTML string
     */
    _formatAlertDisplay(alert) {
        const ltp = this._tradingViewManager.getLastTradedPrice();
        const priceString = alert.Price.toString();
        
        // Pending alerts are orange, others colored based on price comparison
        const color = alert.Id === undefined ? 'orange' :
            alert.Price < ltp ? 'seagreen' : 'orangered';

        return priceString.fontcolor(color);
    }

    /**
     * @private
     * Shows empty state message
     * @param {jQuery} $container Container element
     */
    _showEmptyState($container) {
        // TODO: Replace buildLabel with UI component system
        buildLabel("No AlertZ", 'red').appendTo($container);
    }
}