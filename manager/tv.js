/**
 * DOM Configuration for TradingView operations
 * @class TradingViewDomConfig
 */
class TradingViewDomConfig {
    /**
     * Basic element selectors
     * @type {Object}
     */
    static BASIC = Object.freeze({
        NAME: 'div[class*=mainTitle]',
        TICKER: '#header-toolbar-symbol-search > div',
        EXCHANGE: 'div[class*=exchangeTitle]',
        LTP: 'span[class^="priceWrapper"] > span:first-child'
    });

    /**
     * Popup related selectors
     * @type {Object}
     */
    static POPUPS = Object.freeze({
        AUTO_ALERT: "span:contains('Copy price')"
    });

    /**
     * Replay related selectors
     * @type {Object}
     */
    static REPLAY = Object.freeze({
        ACTIVE: '#header-toolbar-replay[class*=isActive]'
    });

    /**
     * Screener related selectors
     * @type {Object}
     */
    static SCREENER = Object.freeze({
        SYMBOL: '.tv-_symbol',
        SELECTED: '.tv-screener-table__result-row--selected',
        BUTTON: 'button[data-name=toggle-visibility-button]'
    });

    /**
     * Watchlist related selectors
     * @type {Object}
     */
    static WATCHLIST = Object.freeze({
        SYMBOL: 'span[class*=symbolNameText]',
        SELECTED: 'div[class*=selected]'
    });

    /**
     * Error messages
     * @type {Object}
     */
    static ERRORS = Object.freeze({
        LTP_NOT_FOUND: 'LTP element not found',
        LTP_PARSE_FAILED: 'Failed to parse LTP:'
    });
}

// Constants
const PRICE_REGEX = /[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;
const MIN_SELECTED_TICKERS = 2;

/**
 * Manages TradingView page interactions and DOM operations
 * @class TradingViewManager
 */
class TradingViewManager {

    /**
     * @param {SymbolManager} symbolManager Manager for symbol operations
     */
    constructor(symbolManager) {
        this._symbolManager = symbolManager;
    }

    /**
     * Retrieves the name from the DOM
     * @returns {string} The name retrieved from the DOM
     */
    getName() {
        return $(TradingViewDomConfig.BASIC.NAME)[0].innerHTML;
    }

    /**
     * Retrieves the ticker from the DOM
     * @returns {string} Current Ticker
     */
    getTicker() {
        return $(TradingViewDomConfig.BASIC.TICKER).html();
    }

    /**
     * Gets current ticker and maps it to Investing ticker
     * @returns {string} Mapped Investing ticker or original if no mapping exists
     */
    getInvestingTicker() {
        const tvTicker = this.getTicker();
        return this._symbolManager.tvToInvesting(tvTicker);
    }

    /**
     * Retrieves the currently selected exchange
     * @returns {string} Currently Selected Exchange
     */
    getExchange() {
        return $(TradingViewDomConfig.BASIC.EXCHANGE).text();
    }

    /**
     * Retrieves the last traded price
     * @returns {number|null} The last traded price as a float, or null if parsing fails
     */
    getLastTradedPrice() {
        const ltpElement = $(TradingViewDomConfig.BASIC.LTP);
        if (ltpElement.length === 0) {
            console.error(TradingViewDomConfig.ERRORS.LTP_NOT_FOUND);
            return null;
        }

        const ltpText = ltpElement.text();
        const cleanedText = ltpText.replace(/,|\s/g, '');
        const price = parseFloat(cleanedText);

        if (isNaN(price)) {
            console.error(TradingViewDomConfig.ERRORS.LTP_PARSE_FAILED, ltpText);
            return null;
        }

        return price;
    }

    /**
     * Wait for Add Alert Context Menu Option to Capture Price
     * @param {function} callback - Function to be called with the alert price
     */
    getCursorPrice(callback) {
        waitJEE(TradingViewDomConfig.POPUPS.AUTO_ALERT, function (el) {
            let match = PRICE_REGEX.exec(el.text());
            let altPrice = parseFloat(match[0].replace(/,/g, ''));
            callback(altPrice);
        });
    }

    /**
     * Retrieves the selected tickers from the watch list and screener
     * @returns {Array<string>} An array of selected tickers
     */
    getTickersSelected() {
        // TODO: Fix now Broken functions migrated.
        let selected = this.getTickersWatchListSelected()
            .concat(this.getTickersScreenerSelected());

        if (selected.length < MIN_SELECTED_TICKERS) {
            selected = [this.getTicker()];
        }
        return selected;
    }

    /**
     * Checks if the replay is currently active
     * @returns {boolean} true if the replay is active, false otherwise
     */
    isReplayActive() {
        return $(TradingViewDomConfig.REPLAY.ACTIVE).length > 0;
    }
}