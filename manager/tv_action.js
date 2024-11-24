/**
 * Manages TradingView UI actions and interactions
 */
class TradingViewActionManager {
    /**
     * @param {DOMManager} domManager - DOM operation manager
     * @param {TradingViewManager} tvManager - Trading view manager
     */
    constructor(domManager, tvManager) {
        this.domManager = domManager;
        this.tvManager = tvManager;
    }

    /**
     * Opens Current Ticker Relative to Benchmark.
     * Eg. Stock to Nifty, Crypto to Bitcoin etc
     */
    openBenchmarkTicker() {
        const ticker = this.tvManager.getTicker();
        const exchange = this.tvManager.getExchange();
        
        let benchmark;
        switch (exchange) {
            case 'MCX':
                benchmark = 'MCX:GOLD1!';
                break;
            case Constants.EXCHANGE.TYPES.NSE:
                benchmark = 'NIFTY';
                break;
            case 'BINANCE':
                benchmark = 'BINANCE:BTCUSDT';
                break;
            default:
                benchmark = 'XAUUSD';
        }
        
        this.tvManager.openTicker(`${ticker}/${benchmark}`);
    }

    /**
     * Toggles the flag and updates watchlist
     */
    toggleFlag() {
        this.domManager.waitJClick(Constants.DOM.FLAGS.SYMBOL);
        this.tvManager.onWatchListChange();
    }

    /**
     * Closes the text box dialog
     */
    closeTextBox() {
        this.domManager.waitJClick(Constants.DOM.POPUPS.CLOSE_TEXTBOX);
    }

    /**
     * Title Change to Bridge witH AHK
     */
    enableSwiftKey() {
        const liner = ' - SwiftKeys';
        const swiftEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked');
        
        if (swiftEnabled && !document.title.includes('SwiftKeys')) {
            document.title = document.title + liner;
        } else if (!swiftEnabled && document.title.includes('SwiftKeys')) {
            document.title = document.title.replace(liner, '');
        }
    }
}