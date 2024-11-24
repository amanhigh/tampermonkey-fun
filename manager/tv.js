// Price and validation related constants
const PRICE_REGEX = /[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;
const MIN_SELECTED_TICKERS = 2;

// Error messages for LTP operations
const TV_ERRORS = Object.freeze({
    LTP_NOT_FOUND: 'LTP element not found',
    LTP_PARSE_FAILED: 'Failed to parse LTP:'
});

/**
 * Manages TradingView page interactions and DOM operations
 * @class TradingViewManager
 */
class TradingViewManager {
     /**
     * @param {SymbolManager} symbolManager Manager for symbol operations
     * @param {DOMManager} domManager Manager for DOM operations
     */
     constructor(symbolManager, domManager) {
        this._symbolManager = symbolManager;
        this._domManager = domManager;
    }

    /**
     * Retrieves the name from the DOM
     * @returns {string} The name retrieved from the DOM
     */
    getName() {
        return $(Constants.DOM.BASIC.NAME)[0].innerHTML;
    }

    /**
     * Retrieves the ticker from the DOM
     * @returns {string} Current Ticker
     */
    getTicker() {
        return $(Constants.DOM.BASIC.TICKER).html();
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
        return $(Constants.DOM.BASIC.EXCHANGE).text();
    }

    /**
     * Retrieves the last traded price
     * @returns {number|null} The last traded price as a float, or null if parsing fails
     */
    getLastTradedPrice() {
        const ltpElement = $(Constants.DOM.BASIC.LTP);
        if (ltpElement.length === 0) {
            console.error(TV_ERRORS.LTP_NOT_FOUND);
            return null;
        }

        const ltpText = ltpElement.text();
        const cleanedText = ltpText.replace(/,|\s/g, '');
        const price = parseFloat(cleanedText);

        if (isNaN(price)) {
            console.error(TV_ERRORS.LTP_PARSE_FAILED, ltpText);
            return null;
        }

        return price;
    }

    /**
     * Wait for Add Alert Context Menu Option to Capture Price
     * @param {function} callback - Function to be called with the alert price
     */
    getCursorPrice(callback) {
        this._domManager.waitJEE(Constants.DOM.POPUPS.AUTO_ALERT, (el) => {
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
        return $(Constants.DOM.REPLAY.ACTIVE).length > 0;
    }
}