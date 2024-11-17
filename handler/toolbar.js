/**
 * Handles all toolbar and timeframe related operations
 */
class ToolbarHandler {
    constructor(eventManager) {
        this.eventManager = eventManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.eventManager.registerHandler('timeframeSelect', this.SelectTimeframe.bind(this));
        this.eventManager.registerHandler('toolbarSelect', this.SelectToolbar.bind(this));
    }

    /**
     * Selects timeframe based on the provided index
     * @param {number} timeFrameIndex - Index of the timeframe to select
     */
    SelectTimeframe(timeFrameIndex) {
        const timeFrame = this._getTimeFrame(timeFrameIndex);
        this._selectTimeframeElement(timeFrame.index);
    }

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

    _getTimeFrame(timeFrameIndex) {
        return getTimeFrame(timeFrameIndex);
    }

    _selectTimeframeElement(index) {
        $(`${ToolbarConstants.TIMEFRAME_SELECTOR}:nth-child(${index})`).click();
    }

    _selectToolbarElement(index) {
        $(`${ToolbarConstants.TOOLBAR_SELECTOR}:nth(${index})`).click();
    }
}

/**
 * Constants for toolbar operations
 */
// TODO: Inject constants.
const ToolbarConstants = {
    TIMEFRAME_SELECTOR: '.timeframe-button',
    TOOLBAR_SELECTOR: '.toolbar-item',
    STYLE_SELECTOR: '.floating-toolbar-react-widgets button',
    STYLE_ITEM_SELECTOR: '.tv-floating-toolbar__popup div',
    SAVE_SELECTOR: '.header-toolbar-save-load',
    ZONE_TYPES: {
        DEMAND: { symbol: 'DZ' },
        SUPPLY: { symbol: 'SZ' }
    }
};
