/**
 * Manages in-memory alert and audit data for TradingView alerts
 */
class AlertMemStore {
    /**
     * Map of audit results indexed by investing tickers
     * @type {Map<string, AuditResult>}
     * Key: InvestingTicker (e.g., "HDFC-NSE")
     * Value: AuditResult { ticker: InvestingTicker, state: AlertState }
     * @private
     */
    _auditMap;

    /**
     * Map of alerts indexed by pair IDs
     * @type {Map<string, Alert[]>}
     * Key: PairId (e.g., "P123")
     * Value: Array of Alert { Id: string, Price: number, PairId: string }
     * @private
     */
    _alertMap;

    /**
     * Initialize empty AlertMemStore
     */
    constructor() {
        this._auditMap = new Map();
        this._alertMap = new Map();
    }

    // Audit Methods
    /**
     * Add audit result for investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @param {AlertState} state Alert state
     */
    addAuditResult(investingTicker, state) {
        this._auditMap.set(investingTicker, new AuditResult(investingTicker, state));
    }

    /**
     * Get audit result for investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @returns {AuditResult|undefined} Audit result if exists
     */
    getAuditResult(investingTicker) {
        return this._auditMap.get(investingTicker);
    }

    /**
     * Get all audit results
     * @returns {AuditResult[]} Array of all audit results
     */
    getAllAuditResults() {
        return Array.from(this._auditMap.values());
    }

    /**
     * Get filtered audit results by state
     * @param {AlertState} state Alert state to filter by
     * @returns {AuditResult[]} Filtered audit results
     */
    getFilteredAuditResults(state) {
        return this.getAllAuditResults().filter(result => result.state === state);
    }

    /**
     * Get total number of audit results
     * @returns {number} Count of audit results
     */
    getAuditResultsCount() {
        return this._auditMap.size;
    }

    /**
     * Clear all audit results
     */
    clearAuditResults() {
        this._auditMap.clear();
    }

    // Alert Methods
    /**
     * Add alert for pair ID
     * @param {string} pairId Pair identifier
     * @param {Alert} alert Alert object
     */
    addAlert(pairId, alert) {
        const alerts = this._alertMap.get(pairId) || [];
        alerts.push(alert);
        this._alertMap.set(pairId, alerts);
    }

    /**
     * Get alerts for pair ID
     * @param {string} pairId Pair identifier
     * @returns {Alert[]} Array of alerts
     */
    getAlerts(pairId) {
        return this._alertMap.get(pairId) || [];
    }

    /**
     * Get alerts sorted by price for pair ID
     * @param {string} pairId Pair identifier
     * @returns {Alert[]} Sorted array of alerts
     */
    getSortedAlerts(pairId) {
        const alerts = this.getAlerts(pairId);
        return alerts.sort((a, b) => a.Price - b.Price);
    }

    /**
     * Remove alert by pair ID and alert ID
     * @param {string} pairId Pair identifier
     * @param {string} alertId Alert identifier
     */
    removeAlert(pairId, alertId) {
        const alerts = this._alertMap.get(pairId) || [];
        this._alertMap.set(pairId, alerts.filter(alert => alert.Id !== alertId));
    }

    /**
     * Check if pair has any alerts
     * @param {string} pairId Pair identifier
     * @returns {boolean} True if pair has alerts
     */
    hasAlerts(pairId) {
        return this._alertMap.has(pairId) && this.getAlerts(pairId).length > 0;
    }

    /**
     * Get all pair IDs with alerts
     * @returns {string[]} Array of pair IDs
     */
    getAllPairIds() {
        return Array.from(this._alertMap.keys());
    }

    /**
     * Get total number of alerts across all pairs
     * @returns {number} Total alert count
     */
    getAlertCount() {
        let count = 0;
        this._alertMap.forEach(alerts => count += alerts.length);
        return count;
    }

    /**
     * Clear all alerts
     */
    clearAlerts() {
        this._alertMap.clear();
    }

    /**
     * Save alerts from API response
     * @param {Object} data API response data
     * @returns {number} Number of alerts saved
     */
    load(data) {
        this._alertMap.clear();
        let count = 0;

        $(data).find('.js-alert-item[data-trigger=price]').each((i, alertText) => {
            const $alt = $(alertText);
            const alert = new Alert(
                $alt.attr('data-alert-id'),
                parseFloat($alt.attr('data-value')),
                parseFloat($alt.attr('data-pair-id'))
            );

            this.addAlert(alert.PairId, alert);
            count++;
        });

        return count;
    }
}