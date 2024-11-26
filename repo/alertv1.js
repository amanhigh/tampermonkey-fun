/**
* Manages alert operations for trading
*/
class AlertManagerV1 {
    /**
     * @param {AlertRepo} alertRepo Repository for alert operations
     * @param {PairManager} pairManager For pair info lookups
     * @param {TickerManager} tickerManager For ticker operations
     */
    constructor(alertRepo, pairManager, tickerManager) {
        this._alertRepo = alertRepo;
        this._pairManager = pairManager;
        this._tickerManager = tickerManager;
    }
 
    /**
     * Get all alerts for current trading view ticker
     * @returns {Alert[]} Array of alerts sorted by price
     */
    getAlerts() {
        const investingTicker = this._tickerManager.getInvestingTicker();
        return this._getAlertsForInvestingTicker(investingTicker);
    }

     /**
     * Create alert for given investing ticker and price
     * @param {string} investingTicker Investing.com ticker
     * @param {number} price Alert price
     * @throws {Error} If pair info not found for ticker
     * @private
     */
     _createAlert(investingTicker, price) {
        const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
        if (!pairInfo) {
            throw new Error(`No pair info found for ticker: ${investingTicker}`);
        }

        const alert = new Alert(pairInfo.pairId, price);
        this._alertRepo.addAlert(pairInfo.pairId, alert);
    }

    /**
     * Create alert for current trading view ticker
     * @param {number} price Alert price
     * @throws {Error} If pair info not found for current ticker
     */
    createAlertForCurrentTicker(price) {
        const investingTicker = this._tickerManager.getInvestingTicker();
        this._createAlert(investingTicker, price);
    }
 
    /**
     * Delete all alerts for current ticker
     */
    deleteAllAlerts() {
        // TODO: Handler Refresh Alerts on Delete
        const pairInfo = this._getCurrentPairInfo();
        const alerts = this.getAlerts();
        alerts.forEach(alert => {
            this._alertRepo.removeAlert(pairInfo.pairId, alert.Id);
        });
    }
 
    /**
     * Delete alerts near target price for current ticker
     * @param {number} targetPrice Price to delete alerts around
     */
    deleteAlertsByPrice(targetPrice) {
        const pairInfo = this._getCurrentPairInfo();
        const tolerance = targetPrice * 0.03;
        const alerts = this.getAlerts();
        alerts.forEach(alert => {
            if (Math.abs(alert.Price - targetPrice) <= tolerance) {
                this._alertRepo.removeAlert(pairInfo.pairId, alert.Id);
            }
        });
    }
 
    /**
     * @private
     * Get alerts for an investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @returns {Alert[]} Array of alerts sorted by price
     */
    _getAlertsForInvestingTicker(investingTicker) {
        const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
        if (!pairInfo) {
            return [];
        }
        return this._alertRepo.getSortedAlerts(pairInfo.pairId);
    }
 
    /**
     * @private
     * Get pair info for current ticker
     * @throws {Error} If pair info not found
     * @returns {PairInfo} Pair information
     */
    _getCurrentPairInfo() {
        const investingTicker = this._tickerManager.getInvestingTicker();
        const pairInfo = this._pairManager.investingTickerToPairInfo(investingTicker);
        if (!pairInfo) {
            throw new Error(`No pair info found for ticker: ${investingTicker}`);
        }
        return pairInfo;
    }
 }