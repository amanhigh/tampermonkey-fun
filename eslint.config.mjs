/**
 * npm install --save-dev 
 * npx eslint --init
 * npx eslint .
 */
import globals from "globals";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,        // Includes setTimeout, setInterval, requestAnimationFrame, etc.
        ...globals.greasemonkey,   // TamperMonkey/GreaseMonkey globals
        ...globals.jquery,         // jQuery globals ($, jQuery)

        // Handler
        KiteHandler: true,
        CommandInputHandler: true,
        DisplayInputHandler: true,
        RecentCheckboxHandler: true,

        // Managers
        AuditManager: true,
        AuditUIManager: true,
        SymbolManager: true,
        KiteManager: true,
        SequenceManager: true,
        TradingViewManager: true,
        TickerManager: true,
        TradingViewScreenerManager: true,
        TradingViewWatchlistManager: true,
        PaintManager: true,

        // Utils
        ObserveUtil: true,
        KeyUtil: true,
        SearchManager: true,
        SyncUtil: true,
        WaitUtil: true,
        SmartPrompt: true,
        UIUtil: true,
        Styles: true,

        // Repositories
        AlertRepo: true,
        AuditRepo: true,
        BaseRepo: true,
        CategoryRepo: true,
        ExchangeRepo: true,
        FlagRepo: true,
        MapRepo: true,
        OrderRepo: true,
        PairRepo: true,
        RecentTickerRepo: true,
        RepoCron: true,
        SequenceRepo: true,
        SetRepo: true,
        TickerRepo: true,

        // Clients
        BaseClient: true,
        KohanClient: true,
        KiteClient: true,
        InvestingClient: true,

        // Models
        Constants: true,
        PairInfo: true,
        Order: true,
        GttOrderMap: true,
        TimeFrame: true
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "max-lines": ["warn", 200],
      "max-lines": ["error", 500],
    }
  }
];
