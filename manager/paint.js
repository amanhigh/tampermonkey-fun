/**
 * Manages painting operations for TradingView elements
 */
class PaintManager {
    /**
     * Creates a new PaintManager instance
     */
    constructor() {
        this.colorList = Constants.SELECTORS.BASIC.COLOR_LIST;
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
}