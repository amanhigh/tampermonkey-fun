/**
 * Manages painting operations for TradingView elements
 */
class PaintManager {
    /**
     * Creates a new PaintManager instance
     * @param {FlagRepo} flagRepo - Repository for managing flags
     * @param {OrderRepo} orderRepo - Repository for managing orders
     */
    constructor(flagRepo, orderRepo) {
        this.flagRepo = flagRepo;
        this.orderRepo = orderRepo;
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
     * Paint all tickers and their flags based on data from repositories
     * @param {string} selector - The selector for ticker elements
     */
    paintTickers(selector) {
        const orderCategoryLists = this.orderRepo.getOrderCategoryLists();
        const flagCategoryLists = this.flagRepo.getFlagCategoryLists();
        const colorList = Constants.UI.COLORS.LIST;

        for (let i = 0; i < colorList.length; i++) {
            const color = colorList[i];
            const orderSymbols = orderCategoryLists.get(i);
            const flagSymbols = flagCategoryLists.get(i);

            // Use applyCss directly for painting element colors
            this.applyCss(selector, orderSymbols, { 'color': color });
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

        // Reset element colors to default (assumed to be white)
        this.applyCss(selector, null, { 'color': Constants.UI.COLORS.DEFAULT }, true);

        // Reset flag colors
        this.paintFlags(selector, null, Constants.UI.COLORS.DEFAULT, true);
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