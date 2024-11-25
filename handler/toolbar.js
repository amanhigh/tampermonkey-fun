/**
 * Handles all toolbar and timeframe related operations
 */
class ToolbarHandler {
    /**
     * Selects toolbar based on the provided index
     * @param {number} index - Index of the toolbar to select
     */
    SelectToolbar(index) {
        this._selectToolbarElement(index);
    }

    /**
     * Applies style based on timeframe and zone type
     * @param {ZoneType} zoneType - The type of zone to apply (DEMAND/SUPPLY)
     */
    SelectTimeFrameStyle(zoneType) {
        // Combine the timeframe-specific style with the zone type symbol and apply it
        const styleToApply = `${timeFrame.style}${zoneType.symbol}`;
        this._applyStyle(styleToApply);
    }

    /**
     * Applies a specific style by name
     * @param {string} styleName - Name of the style to apply
     */
    Style(styleName) {
        this._applyStyle(styleName);
    }

    // Private helper methods

    _applyStyle(styleName) {
        waitClick(ToolbarConstants.STYLE_SELECTOR, () => {
            waitJClick(`${ToolbarConstants.STYLE_ITEM_SELECTOR}:contains(${styleName})`);
        });
    }
}