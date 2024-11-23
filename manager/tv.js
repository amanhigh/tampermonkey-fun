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
        let selected = this.getTickersWatchListSelected()
            .concat(this.getTickersScreenerSelected());

        if (selected.length < MIN_SELECTED_TICKERS) {
            selected = [this.getTicker()];
        }
        return selected;
    }

    /**
     * Retrieves the tickers from the watch list
     * @param {boolean} [visible=false] - indicates whether the tickers should be visible
     * @returns {Array<string>} Array of watch list tickers
     */
    getTickersWatchList(visible = false) {
        return this._tickerListHelper(TradingViewDomConfig.WATCHLIST.SYMBOL, visible);
    }

    /**
     * Retrieves tickers from the screener
     * @param {boolean} [visible=false] - indicates if the tickers are visible
     * @returns {Array<string>} Array of screener tickers
     */
    getTickersScreener(visible = false) {
        return this._tickerListHelper(TradingViewDomConfig.SCREENER.SYMBOL, visible);
    }

    /**
     * Retrieves the selected watch list symbols from the DOM
     * @returns {Array<string>} An array of selected watch list symbols
     */
    getTickersWatchListSelected() {
        return $(`${TradingViewDomConfig.WATCHLIST.SELECTED} ${TradingViewDomConfig.WATCHLIST.SYMBOL}:visible`)
            .toArray()
            .map(s => s.innerHTML);
    }

    /**
     * Retrieves the tickers of the selected items in the screener
     * @returns {Array<string>} An array of selected screener ticker symbols
     */
    getTickersScreenerSelected() {
        return $(`${TradingViewDomConfig.SCREENER.SELECTED} ${TradingViewDomConfig.SCREENER.SYMBOL}:visible`)
            .toArray()
            .map(s => s.innerHTML);
    }

    /**
     * Helper function to retrieve list of tickers based on selector
     * @private
     * @param {string} selector - The CSS selector for identifying the elements
     * @param {boolean} [visible=false] - Flag indicating whether to consider only visible elements
     * @returns {Array<string>} An array of ticker strings
     */
    _tickerListHelper(selector, visible = false) {
        return $(visible ? selector + ":visible" : selector)
            .toArray()
            .map(s => s.innerHTML);
    }

    /**
     * Checks if the replay is currently active
     * @returns {boolean} true if the replay is active, false otherwise
     */
    isReplayActive() {
        return $(TradingViewDomConfig.REPLAY.ACTIVE).length > 0;
    }

    /**
     * Check if the screener is visible
     * @returns {boolean} true if the screener is not active, false otherwise
     */
    isScreenerVisible() {
        return $(TradingViewDomConfig.SCREENER.BUTTON).attr('data-active') === 'false';
    }
}