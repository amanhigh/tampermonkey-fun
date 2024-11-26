/**
 * Manages TradingView style and toolbar operations
 */
class StyleManager {
    /**
     * @param {WaitUtil} waitUtil - Manager for DOM operations
     */
    constructor(waitUtil) {
        this.waitUtil = waitUtil;
    }

    /**
     * Selects a toolbar item by index
     * @param {number} index - The toolbar index (0-based)
     * @returns {boolean} True if selection was successful
     * @throws {Error} If index is invalid
     */
    selectToolbar(index) {
        try {
            // Validate index range
            if (index < 0 || index > 10) {
                throw new Error(`Invalid toolbar index: ${index}`);
            }

            const toolbar = $(`${Constants.DOM.TOOLBARS.MAIN}:nth(${index})`);
            if (toolbar.length === 0) {
                return false;
            }

            toolbar.click();
            return true;
        } catch (error) {
            console.error('Error selecting toolbar:', error);
            return false;
        }
    }

    /**
     * Applies zone style based on timeframe and zone type
     * @param {Object} zoneType Zone type constants from TRADING.ZONES
     * @param {string} currentStyle Current timeframe style
     * @returns {boolean} True if style was applied
     */
    selectZoneStyle(zoneType, currentStyle) {
        try {
            // TODO: Fix the logic
            if (!currentStyle) {
                return false;
            }

            // Combine timeframe style with zone symbol
            const styleName = currentStyle + zoneType.symbol;
            return this.applyStyle(styleName);
        } catch (error) {
            console.error('Error selecting zone style:', error);
            return false;
        }
    }

    /**
     * Applies named style using trading view selectors
     * @param {string} styleName Name of style to apply
     * @returns {boolean} True if style was applied
     */
    applyStyle(styleName) {
        try {
            // Select style toolbar
            this.waitUtil.waitJClick(Constants.DOM.TOOLBARS.STYLE, () => {
                // Select specific style by name
                this.waitUtil.waitJClick(
                    `${Constants.DOM.TOOLBARS.STYLE_ITEM}:contains(${styleName})`
                );
            });
            return true;
        } catch (error) {
            console.error('Error applying style:', error);
            return false;
        }
    }
}