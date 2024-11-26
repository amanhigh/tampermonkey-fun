// Price and validation related constants
const PRICE_REGEX = /[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;

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
     * @param {SymbolManager} symbolManager - Manager for symbol operations
     * @param {WaitUtil} waitUtil - Manager for DOM operations
     * @param {PaintManager} paintManager - Instance of PaintManager
     * @param {OrderRepo} orderRepo - Instance of OrderRepo
     * @param {FlagRepo} flagRepo - Instance of FlagRepo
     * @param {TradingViewScreenerManager} screenerManager - Manager for screener operations
     * @param {TradingViewWatchlistManager} watchlistManager - Manager for watchlist operations
     */
    constructor(symbolManager, waitUtil, paintManager, orderRepo, flagRepo, screenerManager, watchlistManager) {
        this.symbolManager = symbolManager;
        this.waitUtil = waitUtil;
        this.paintManager = paintManager;
        this.orderRepo = orderRepo;
        this.flagRepo = flagRepo;
        this.screenerManager = screenerManager;
        this.watchlistManager = watchlistManager;
    }

    /**
     * Retrieves the name from the DOM
     * @returns {string} The name retrieved from the DOM
     */
    getName() {
        return $(Constants.DOM.BASIC.NAME)[0].innerHTML;
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
        this.waitUtil.waitJEE(Constants.DOM.POPUPS.AUTO_ALERT, (el) => {
            let match = PRICE_REGEX.exec(el.text());
            let altPrice = parseFloat(match[0].replace(/,/g, ''));
            callback(altPrice);
        });
    }

    /**
     * Copies the given text to the clipboard and displays a message.
     *
     * @param {string} text - The text to be copied to the clipboard
     * @return {undefined} 
     */
    clipboardCopy(text) {
        GM_setClipboard(text);
        this.message(`ClipCopy: ${text}`, 'yellow');
    }
   
    /**
     * Toggles the flag and updates watchlist
     */
    toggleFlag() {
        this.waitUtil.waitJClick(Constants.DOM.FLAGS.SYMBOL);
        this.tvManager.onWatchListChange();
    }

    /**
     * Closes the text box dialog
     */
    closeTextBox() {
        this.waitUtil.waitJClick(Constants.DOM.POPUPS.CLOSE_TEXTBOX);
    }
}