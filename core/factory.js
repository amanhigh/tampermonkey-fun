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
}
