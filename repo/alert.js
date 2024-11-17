/**
 * Repository for managing trading alerts
 */
class AlertRepo {
    /**
     * Map of alerts indexed by pair IDs
     * @type {Map<string, Alert[]>}
     * @private
     */
    _alertMap;

    constructor() {
        this._alertMap = new Map();
    }

    /**
     * Add alert for pair ID
     * @param {string} pairId Pair identifier
     * @param {Alert} alert Alert object
     * @throws {Error} If alert is invalid
     */
    addAlert(pairId, alert) {
        if (!alert || !alert.Price || !alert.PairId) {
            throw new Error('Invalid alert object');
        }
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
        return [...alerts].sort((a, b) => a.Price - b.Price);
    }

    /**
     * Remove alert by pair ID and alert ID
     * @param {string} pairId Pair identifier
     * @param {string} alertId Alert identifier
     * @returns {boolean} True if alert was removed
     */
    removeAlert(pairId, alertId) {
        const alerts = this._alertMap.get(pairId) || [];
        const filteredAlerts = alerts.filter(alert => alert.Id !== alertId);
        this._alertMap.set(pairId, filteredAlerts);
        return filteredAlerts.length !== alerts.length;
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
    clear() {
        this._alertMap.clear();
    }
}