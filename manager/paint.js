/**
 * Manages painting operations for TradingView elements
 */
class PaintManager {
    /**
     * Creates a new PaintManager instance
     * @param {CategoryManager} categoryManager - Manager for category operations
     * @param {TickerManager} tickerManager - Manager for ticker operations
     * @param {TradingViewManager} tvManager - Manager for TradingView operations
     */
    constructor(categoryManager, tickerManager, tvManager) {
        this.categoryManager = categoryManager;
        this.tickerManager = tickerManager;
        this.tvManager = tvManager;
    }

    /**
     * Apply CSS to elements matching the given selector based on the symbol set.
     * @param {string} selector - The CSS selector for the elements to be styled
     * @param {Set<string>|null} symbolSet - The set of symbols used to filter the elements
     * @param {Object} css - The CSS properties to be applied
     * @param {boolean} [force=false] - If true, apply CSS regardless of symbolSet
     * @throws {Error} If selector or CSS object is missing
     */
    applyCss(selector, symbolSet, css, force = false) {
        if (!selector || !css) {
            throw new Error('Selector and CSS object are required');
        }

        $(selector).filter((_, element) => 
            force || (symbolSet && symbolSet.has(element.innerHTML))
        ).css(css);
    }

    /**
     * Apply color to flags for elements matching the selector
     * @param {string} selector - The base selector for finding elements
     * @param {Set<string>|null} symbols - The set of symbols to filter elements
     * @param {string} color - The color to apply
     * @param {boolean} [force=false] - If true, apply color regardless of symbols
     */
    paintFlags(selector, symbols, color, force = false) {
        if (!selector) {
            throw new Error('Selector is required');
        }

        $(`${selector}`).filter((_, element) => 
            force || (symbols && symbols.has(element.innerHTML))
        ).parents(Constants.SELECTORS.WATCHLIST.ITEM_SELECTOR)
         .find(Constants.SELECTORS.FLAGS.SELECTOR)
         .css('color', color);
    }

    /**
     * Paint all tickers and their flags based on categories
     * @param {string} selector - The selector for ticker elements
     */
    paintTickers(selector) {
        const colorList = Constants.UI.COLORS.LIST;

        // Paint based on order categories and flag categories
        for (let i = 0; i < colorList.length; i++) {
            const color = colorList[i];
            
            // Paint orders
            const orderSymbols = this.categoryManager.getOrderCategory(i);
            this.applyCss(selector, orderSymbols, { 'color': color });
            
            // Paint flags
            const flagSymbols = this.categoryManager.getFlagCategory(i);
            this.paintFlags(selector, flagSymbols, color);
        }
    }

    /**
     * Resets the colors of the specified selector to the default color.
     * @param {string} selector - The selector for the elements to reset the colors
     * @throws {Error} If selector is missing
     */
    resetColors(selector) {
        if (!selector) {
            throw new Error('Selector is required');
        }

        // Reset element colors to default
        this.applyCss(selector, null, { 'color': Constants.UI.COLORS.DEFAULT }, true);

        // Reset flag colors
        this.paintFlags(selector, null, Constants.UI.COLORS.DEFAULT, true);
    }

    
    /**
     * Paints all aspects of the current ticker display
     */
    paintHeader() {
        const ticker = this.tickerManager.getTicker();
        const name = this.tvManager.getName();
        const exchange = this.tickerManager.getCurrentExchange();

        if (!ticker || !name || !exchange) {
            console.error('Missing required data for painting ticker');
            return;
        }

        const $name = $(Constants.DOM.BASIC.NAME);
        
        // Paint each component
        this._paintNameElement($name, name, ticker);
        this._paintFNOMarking($name, ticker);
        this._paintFlagAndExchange(ticker, exchange);
    }

    /**
     * Paints the name element with appropriate category color
     * @private
     * @param {jQuery} $name - jQuery element for the name
     * @param {string} name - Name text to display
     * @param {string} ticker - Ticker symbol
     */
    _paintNameElement($name, name, ticker) {
        $name.css('color', Constants.UI.COLORS.DEFAULT);

        // Paint based on order categories
        for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
            const categorySymbols = this.categoryManager.getOrderCategory(i);
            if (categorySymbols && categorySymbols.has(ticker)) {
                $name.css('color', this._getCategoryColor(i));
                break; // Stop after first matching category
            }
        }
    }

    /**
     * Gets the appropriate color for a category index
     * @private
     * @param {number} index Category index
     * @returns {string} Color for the category
     */
    _getCategoryColor(index) {
        const colorList = Constants.UI.COLORS.LIST;
        return index === 5 ? colorList[6] : colorList[index];
    }

    /**
     * Paints flag and exchange elements for a ticker
     * @private
     * @param {string} ticker - Ticker symbol
     * @param {string} exchange - Exchange identifier from TickerManager
     */
    _paintFlagAndExchange(ticker, exchange) {
        const $flag = $(Constants.DOM.FLAGS.MARKING);
        const $exchange = $(Constants.DOM.BASIC.EXCHANGE);

        // Reset colors and set exchange text
        $flag.css('color', Constants.UI.COLORS.DEFAULT);
        $exchange.css('color', Constants.UI.COLORS.DEFAULT);

        // Paint flags and exchange based on flag categories
        Constants.UI.COLORS.LIST.forEach((color, i) => {
            const flagSymbols = this.categoryManager.getFlagCategory(i);
            if (flagSymbols && flagSymbols.has(ticker)) {
                $flag.css('color', color);
                $exchange.css('color', color);
                return false; // Break the loop after first match
            }
        });
    }

    /**
     * Paints FNO marking for a ticker
     * @private
     * @param {jQuery} $name - jQuery element for the name
     * @param {string} ticker - Ticker symbol
     */
    _paintFNOMarking($name, ticker) {
        if (Constants.EXCHANGE.FNO_SYMBOLS.has(ticker)) {
            $name.css(Constants.UI.COLORS.FNO_CSS);
        } else {
            $name.css('border-top-style', '');
            $name.css('border-width', '');
        }
    }
}