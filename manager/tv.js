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

    getInvestingTicker() {
        const tvTicker = this.getTicker();
        return this._symbolManager.tvToInvesting(tvTicker);
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
     * Paints the name in the top section if the ticker is in the watchlist
     */
    paintName() {
        let ticker = this.getTicker();
        let $name = $(Constants.DOM.BASIC.NAME);
        const colorList = Constants.UI.COLORS.LIST;

        //Reset Name Color
        $name.css('color', Constants.UI.COLORS.DEFAULT);

        //Find and Paint if found in Watchlist
        for (let i = 0; i < colorList.length; i++) {
            //Highlight Non White if in Watchlist or Color respectively
            let color = i === 5 ? colorList[6] : colorList[i];
            if (this.orderRepo.getOrderCategoryLists().get(i).has(ticker)) {
                $name.css('color', color);
            }
        }

        //FNO Marking
        if (Constants.EXCHANGE.FNO_SYMBOLS.has(ticker)) {
            $name.css(Constants.UI.COLORS.FNO_CSS);
        } else {
            $name.css('border-top-style', '');
            $name.css('border-width', '');
        }

        //Flag Marking
        let $flag = $(Constants.DOM.FLAGS.MARKING);
        $flag.css('color', Constants.UI.COLORS.DEFAULT);
        $(Constants.DOM.BASIC.EXCHANGE).css('color', Constants.UI.COLORS.DEFAULT);
        colorList.forEach((c, i) => {
            if (this.flagRepo.getOrderCategoryLists().get(i).has(ticker)) {
                $flag.css('color', c)
                $(Constants.DOM.BASIC.EXCHANGE).css('color', c);
            }
        })
    }
}