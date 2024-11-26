class AlertHandler {
    /**
     * @param {AlertManagerV1} alertManager
     * @param {TradingViewManager} tradingViewManager
     */
    constructor(alertManager, tradingViewManager) {
        this._alertManager = alertManager;
        this._tradingViewManager = tradingViewManager;
    }

    /**
     * Creates alerts from textbox values
     */
    createAlertsFromTextBox() {
        // TODO: Check for Input Manager
        const price = $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val();
        if (!price) {
            return;
        }

        const prices = price.trim().split(" ");
        prices.forEach(p => {
            try {
                this._alertManager.createAlertForCurrentTicker(parseFloat(p));
                // TODO: Extract Message System
                message(`Alert created at ${p}`, 'green');
            } catch (error) {
                message(error.message, 'red');
            }
        });

        setTimeout(() => {
            $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val('');
        }, 5000);
    }

    /**
     * Creates alert at cursor price position
     */
    createAlertAtCursor() {
        // TODO: Convert to Async ?
        this._tradingViewManager.getCursorPrice(price => {
            try {
                this._alertManager.createAlertForCurrentTicker(price);
                // TODO: Extract Message System
                message(`Alert created at cursor price: ${price}`, 'green');
            } catch (error) {
                message(error.message, 'red');
            }
        });
    }

    /**
     * Creates alert 20% above current price
     */
    createHighAlert() {
        const currentPrice = this._tradingViewManager.getLastTradedPrice();
        if (currentPrice === null) {
            // TODO: Extract Message System
            message('Could not get current price', 'red');
            return;
        }

        const targetPrice = (currentPrice * 1.2).toFixed(2);
        try {
            this._alertManager.createAlertForCurrentTicker(parseFloat(targetPrice));
            // TODO: Extract Message System
            message(`High alert created at ${targetPrice}`, 'green');
        } catch (error) {
            message(error.message, 'red');
        }
    }

    /**
     * Deletes alerts near cursor price
     */
    deleteAlertAtCursor() {
        this._tradingViewManager.getCursorPrice(price => {
            try {
                this._alertManager.deleteAlertsByPrice(price);
                // TODO: Extract Message System
                message(`Alerts deleted around price: ${price}`, 'green');
            } catch (error) {
                message(error.message, 'red');
            }
        });
    }
}