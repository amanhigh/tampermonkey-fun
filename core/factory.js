/**
 * Factory for creating and managing singleton instances
 */
class Factory {
    static _instances = {};

    /**
     * Repository Layer
     * Handles data persistence and storage
     */
    static repo = {
        /**
         * @returns {RepoCron}
         */
        cron: () => Factory._getInstance('repoCron', 
            () => new RepoCron()),

        /**
         * @returns {AlertRepo}
         */
        alert: () => Factory._getInstance('alertRepo', 
            () => new AlertRepo(Factory.repo.cron())),

        /**
         * @returns {AuditRepo}
         */
        audit: () => Factory._getInstance('auditRepo', 
            () => new AuditRepo(Factory.repo.cron())),

        /**
         * @returns {ExchangeRepo}
         */
        exchange: () => Factory._getInstance('exchangeRepo', 
            () => new ExchangeRepo(Factory.repo.cron())),

        /**
         * @returns {FlagRepo}
         */
        flag: () => Factory._getInstance('flagRepo', 
            () => new FlagRepo(Factory.repo.cron())),

        /**
         * @returns {OrderRepo}
         */
        order: () => Factory._getInstance('orderRepo', 
            () => new OrderRepo(Factory.repo.cron())),

        /**
         * @returns {PairRepo}
         */
        pair: () => Factory._getInstance('pairRepo', 
            () => new PairRepo(Factory.repo.cron())),

        /**
         * @returns {RecentTickerRepo}
         */
        recent: () => Factory._getInstance('recentRepo', 
            () => new RecentTickerRepo(Factory.repo.cron())),

        /**
         * @returns {SequenceRepo}
         */
        sequence: () => Factory._getInstance('sequenceRepo', 
            () => new SequenceRepo(Factory.repo.cron())),

        /**
         * @returns {TickerRepo}
         */
        ticker: () => Factory._getInstance('tickerRepo', 
            () => new TickerRepo(Factory.repo.cron())),
    };

    /**
     * Manager Layer
     * Handles business logic and coordination
     */
    static manager = {
        /**
         * @returns {AuditManager}
         */
        audit: () => Factory._getInstance('auditManager', 
            () => new AuditManager(Factory.repo.alert(), Factory.ui.audit())),

        /**
         * @returns {AlertManager}
         */
        alert: () => Factory._getInstance('alertManager', 
            () => new AlertManager(Factory.repo.alert(), Factory.ui.alert())),
    };

    /**
     * UI Layer
     * Handles user interface components
     */
    static ui = {
        /**
         * @returns {AuditUIManager}
         */
        audit: () => Factory._getInstance('auditUIManager', 
            () => new AuditUIManager(Constants.AREAS.AUDIT_ID)),

        /**
         * @returns {AlertUIManager}
         */
        alert: () => Factory._getInstance('alertUIManager', 
            () => new AlertUIManager(Constants.AREAS.ALERTS_ID)),
    };

    /**
     * Creates or retrieves a singleton instance
     * @private
     * @param {string} key Instance identifier
     * @param {Function} creator Factory function
     * @returns {any} Instance
     */
    static _getInstance(key, creator) {
        if (!this._instances[key]) {
            try {
                this._instances[key] = creator();
            } catch (error) {
                console.error(`Error creating instance for ${key}:`, error);
                throw error;
            }
        }
        return this._instances[key];
    }
}