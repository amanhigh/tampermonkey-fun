/**
 * Repository for managing alert audit results
 */
class AuditRepo {
    /**
     * Map of audit results indexed by investing tickers
     * @type {Map<string, AlertAudit>}
     * @private
     */
    _auditMap;

    constructor() {
        this._auditMap = new Map();
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
        this._auditMap.set(investingTicker, new AlertAudit(investingTicker, state));
    }

    /**
     * Get audit result for investing ticker
     * @param {string} investingTicker Investing.com ticker
     * @returns {AlertAudit|undefined} Audit result if exists
     */
    getAuditResult(investingTicker) {
        return this._auditMap.get(investingTicker);
    }

    /**
     * Get all audit results
     * @returns {AlertAudit[]} Array of all audit results
     */
    getAllAuditResults() {
        return Array.from(this._auditMap.values());
    }

    /**
     * Get filtered audit results by state
     * @param {AlertState} state Alert state to filter by
     * @returns {AlertAudit[]} Filtered audit results
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
    clear() {
        this._auditMap.clear();
    }
}