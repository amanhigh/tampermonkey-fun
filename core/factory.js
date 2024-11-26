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
 *    - Example: WaitUtil, SyncUtil, KeyUtil
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
        recentTicker: () => Factory._getInstance('recentTickerRepo', 
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
            () => new KiteHandler(
                Factory.manager.kite(),
                Factory.manager.symbol()
            )),

        /**
         * @returns {CommandInputHandler}
         */
        commandInput: () => Factory._getInstance('commandInputHandler',
            () => new CommandInputHandler(
                Factory.util.event(),
                Constants.SELECTORS.INPUT_BOX.INPUT_ID
            )),

        /**
         * @returns {DisplayInputHandler}
         */
        displayInput: () => Factory._getInstance('displayInputHandler',
            () => new DisplayInputHandler(
                Factory.util.event(),
                Constants.SELECTORS.INPUT_BOX.DISPLAY_ID,
                Factory.manager.sequence(),
                Factory.manager.tradingView()
            )),

        /**
         * @returns {RecentCheckboxHandler}
         */
        recentCheckbox: () => Factory._getInstance('recentCheckboxHandler',
            () => new RecentCheckboxHandler(
                Constants.SELECTORS.CHECK_BOX.RECENT_ID,
                Factory.manager.ticker()
            ))
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
            () => new SymbolManager(
                Factory.repo.ticker(),
                Factory.repo.exchange()
            )),

        /**
         * @returns {SequenceManager}
         */
        sequence: () => Factory._getInstance('sequenceManager',
            () => new SequenceManager(
                Factory.repo.sequence()
            )),

        /**
         * @returns {TradingViewWatchlistManager}
         */
        watchlist: () => Factory._getInstance('tradingViewWatchlistManager',
            () => new TradingViewWatchlistManager()),

        /**
         * @returns {TradingViewScreenerManager}
         */
        screener: () => Factory._getInstance('tradingViewScreenerManager',
            () => new TradingViewScreenerManager(
                Factory.manager.paint(),
                Factory.repo.recentTicker(),
                Factory.repo.order()
            )),


        /**
         * @returns {TradingViewManager}
         */
        tradingView: () => Factory._getInstance('tradingViewManager',
            () => new TradingViewManager(
                Factory.manager.symbol(),
                Factory.util.dom()
            )),

        /**
         * @returns {PaintManager}
         */
        paint: () => Factory._getInstance('paintManager',
            () => new PaintManager(
                Factory.repo.flag(),
                Factory.repo.order()
            )),

        /**
         * @returns {TickerManager}
         */
        ticker: () => Factory._getInstance('tickerManager',
            () => new TickerManager(
                Factory.repo.recentTicker()
            )),

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
         * @returns {WaitUtil}
         */
        dom: () => Factory._getInstance('waitUtil',
            () => new WaitUtil()),

        /**
         * @returns {ObserveUtil}
         */
        observer: () => Factory._getInstance('observeUtil',
            () => new ObserveUtil()),

        /**
         * @returns {SearchUtil}
         */
        search: () => Factory._getInstance('searchManager',
            () => new SearchUtil()),

        /**
         * @returns {SyncUtil}
         */
        sync: () => Factory._getInstance('syncUtil',
            () => new SyncUtil()),

        /**
         * @returns {KeyUtil}
         */
        key: () => Factory._getInstance('keyManager',
            () => new KeyUtil(Factory.util.sync())),

        /**
         * @returns {SmartPrompt}
         */
        smart: () => Factory._getInstance('smartPrompt',
            () => new SmartPrompt()),

        /**
         * @returns {UIUtil}
         */
        ui: () => Factory._getInstance('uiUtil',
            () => new UIUtil()),
        
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
