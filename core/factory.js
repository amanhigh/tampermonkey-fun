/**
 * Project Architecture Overview
 * ----------------------------
 * Greasemonkey Script Architecture
 * Note: Due to Greasemonkey script constraints, ES6 modules (import/export) are not supported.
 * All code must be in global scope with proper namespacing through classes and factory pattern.
 * 
 * 1. Layer Structure and Dependencies:
 *    
 *    Repository/Client ← Manager ← Handler
 *    
 *    [Handler Layer]
 *    - Handles external events (UI, Greasemonkey)
 *    - Manages user interactions
 *    - Coordinates UI updates
 *    - Example: KiteHandler, AlertHandler
 *    - Cross-talk permitted but not recommended
 *    
 *    [Manager Layer]
 *    - Contains core business logic
 *    - Coordinates between handlers and repositories/clients
 *    - Implements business rules and workflows
 *    - Example: KiteManager, AlertManager
 *    - Cross-talk allowed and common via constructor injection
 *    
 *    [Repository/Client Layer]
 *    - Repository: Handles data persistence and storage
 *    - Client: Handles external service integrations
 *    - Examples: AlertRepo, KiteClient
 *    - STRICT: No cross-talk allowed, must be independent
 * 
 * 2. Dependency and Communication Rules:
 *    Vertical Dependencies:
 *    - Handlers can depend on Managers
 *    - Managers can depend on Repositories and Clients
 *    - Repositories/Clients must be independent
 *    - STRICT: No reverse dependencies allowed
 *      × Repository cannot depend on Manager
 *      × Manager cannot depend on Handler
 *    
 *    Horizontal Communication (Cross-talk):
 *    - Manager Layer: ✓ Allowed and common
 *      Example: AlertManager requires AuditManager in constructor
 *    - Handler Layer: ⚠️ Permitted but not recommended
 *      Should be coordinated through managers when possible
 *    - Repository/Client Layer: ✗ Strictly forbidden
 *      Must remain independent for data integrity
 * 
 * 3. Utility Classes:
 *    - Support classes that can be used across layers
 *    - Example: DOMManager, SyncManager, KeyManager
 *    - Generally stateless or with controlled state
 * 
 * 4. Factory Pattern:
 *    - Manages singleton instances
 *    - Handles dependency injection
 *    - Organized by layer (client, repo, manager, handler)
 *    - Ensures proper dependency flow
 *    - Facilitates allowed cross-talk through constructor injection
 * 
 * Usage Examples:
 * // Cross-talk through constructor injection
 * // Factory ensures proper injection
 * static manager = {
 *     alert: () => Factory._getInstance('alertManager', 
 *         () => new AlertManager(
 *             Factory.repo.alert(),
 *             Factory.manager.audit()  // Cross-talk dependency injected
 *         ))
 * };
 */
class Factory {
    static _instances = {};

    /**
     * Client Layer
     * Handles external API interactions
     */
    static client = {
        /**
         * @returns {InvestingClient}
         */
        investing: () => Factory._getInstance('investingClient',
            () => new InvestingClient()),

        /**
         * @returns {KiteClient}
         */
        kite: () => Factory._getInstance('kiteClient',
            () => new KiteClient()),

        /**
         * @returns {KohanClient}
         */
        kohan: () => Factory._getInstance('kohanClient',
            () => new KohanClient()),
    };

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
     * Handler Layer
     * Handles specific domain-specific logic and interactions
     */
    static handler = {
        /**
         * @returns {KiteHandler}
         */
        kite: () => Factory._getInstance('kiteHandler',
            () => new KiteHandler(Factory.manager.kite())),
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

        /**
         * @returns {SymbolManager}
         */
        symbol: () => Factory._getInstance('symbolManager',
            () => new SymbolManager()),

        /**
         * @returns {KiteManager}
         */
        kite: () => Factory._getInstance('kiteManager', 
            () => new KiteManager(Factory.manager.symbol(), Factory.client.kite())),
    };

    /**
     * Utility Layer
     * Handles utility operations and management
     */
    static util = {
        /**
         * @returns {DOMManager}
         */
        dom: () => Factory._getInstance('domManager',
            () => new DOMManager()),

        /**
         * @returns {DOMObserver}
         */
        observer: () => Factory._getInstance('domObserver',
            () => new DOMObserver()),

        /**
         * @returns {SearchManager}
         */
        search: () => Factory._getInstance('searchManager',
            () => new SearchManager()),

        /**
         * @returns {SyncManager}
         */
        sync: () => Factory._getInstance('syncManager',
            () => new SyncManager()),

        /**
         * @returns {KeyManager}
         */
        key: () => Factory._getInstance('keyManager',
            () => new KeyManager(Factory.util.sync()))
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
