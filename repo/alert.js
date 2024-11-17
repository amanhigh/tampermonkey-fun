/**
 * Repository for managing trading alerts
 */
class AlertRepo extends MapRepo {
    constructor() {
        super(alertInfoStore);
    }

    /**
     * @protected
     * @param {Object} data Raw storage data
     * @returns {Map<string, Alert[]>} Map of alerts
     */
    _deserialize(data) {
        const alertMap = new Map();
        Object.entries(data).forEach(([pairId, alerts]) => {
            alertMap.set(pairId, alerts.map(alert => 
                new Alert(alert.PairId, alert.Price, alert.Id)
            ));
        });
        return alertMap;
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
        const alerts = this.get(pairId) || [];
        alerts.push(alert);
        this.set(pairId, alerts);
    }

    /**
     * Get alerts sorted by price for pair ID
     * @param {string} pairId Pair identifier
     * @returns {Alert[]} Sorted array of alerts
     */
    getSortedAlerts(pairId) {
        const alerts = this.get(pairId) || [];
        return [...alerts].sort((a, b) => a.Price - b.Price);
    }

    /**
     * Remove alert by pair ID and alert ID
     * @param {string} pairId Pair identifier
     * @param {string} alertId Alert identifier
     */
    removeAlert(pairId, alertId) {
        const alerts = this.get(pairId) || [];
        const filteredAlerts = alerts.filter(alert => alert.Id !== alertId);
        this.set(pairId, filteredAlerts);
    }

    /**
     * Check if pair has any alerts
     * @param {string} pairId Pair identifier
     * @returns {boolean} True if pair has alerts
     */
    hasAlerts(pairId) {
        return this.has(pairId) && (this.get(pairId)?.length > 0);
    }

    /**
     * Get total number of alerts across all pairs
     * @returns {number} Total alert count
     */
    getAlertCount() {
        let count = 0;
        this._map.forEach(alerts => count += alerts.length);
        return count;
    }
}