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

        // Managers
        AuditManager: true,
        AuditUIManager: true,

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

        // Misc
        Constants: true,

        // Custom Globals
        alertStore: true,
        AlertState: true,
        orderSet: true,
        mapInvestingPair: true,
        getMappedTicker: true,
        getTicker: true,
        mapTicker: true,
        reverseMapTicker: true,
        message: true,
        buildButton: true,
        OpenTicker: true,
        deletePairInfo: true,
        getAllAlertTickers: true,
        waitOn: true,
        AuditCurrentTicker: true,
        getAllAlerts: true,
        buildLabel: true,
        getLastTradedPrice: true,
        HandleAlertDelete: true,
        deleteAlert: true,
        getCursorPrice: true,
        createAlert: true,
        AuditAlerts: true,
        clearFields: true,
        mapAlert: true,
        getExchange: true,
        SmartPrompt: true,
        pinInvestingPair: true,
        pinInvestingTicker: true,
        fetchSymbolData: true,
        Alert: true,
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error"
    }
  }
];