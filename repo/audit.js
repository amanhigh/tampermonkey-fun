/**
 * Repository for managing alert audit results
 */
class AuditRepo extends MapRepo {
    /**
     * @param {RepoCron} repoCron Repository auto-save manager
     */
    constructor(repoCron) {
        super(repoCron, "auditRepo");
    }

    /**
     * @protected
     * @param {Object} data Raw storage data
     * @returns {Map<string, AlertAudit>} Map of audit results
     */
    _deserialize(data) {
        const auditMap = new Map();
        Object.entries(data).forEach(([ticker, audit]) => {
            auditMap.set(ticker, new AlertAudit(audit.ticker, audit.state));
        });
        return auditMap;
    }

    /**
     * Add audit result for investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @param {AlertState} state Alert state
     * @throws {Error} If state is invalid
     */
    addAuditResult(investingTicker, state) {
        if (!Object.values(AlertState).includes(state)) {
            throw new Error('Invalid alert state');
        }
        this.set(investingTicker, new AlertAudit(investingTicker, state));
    }

    /**
     * Get filtered audit results by state
     * @param {AlertState} state Alert state to filter by
     * @returns {AlertAudit[]} Filtered audit results
     */
    getFilteredAuditResults(state) {
        return Array.from(this._map.values())
            .filter(result => result.state === state);
    }
}