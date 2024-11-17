/**
 * Core event management system for handling application events
 */
class EventManager {
    constructor() {
        this.handlers = new Map();
    }

    registerHandler(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
    }

    unregisterHandler(eventType, handler) {
        if (this.handlers.has(eventType)) {
            this.handlers.get(eventType).delete(handler);
        }
    }

    emit(eventType, data) {
        if (this.handlers.has(eventType)) {
            this.handlers.get(eventType).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in handler for ${eventType}:`, error);
                }
            });
        }
    }
}


/**
 * Enhanced UIManager with toolbar-specific operations
 */
class UIManager {
    constructor() {
        this.elementCache = new Map();
    }

    toggleElement(elementId) {
        const element = this._getElement(elementId);
        if (element) {
            element.toggle();
        }
    }

    _getElement(elementId) {
        if (!this.elementCache.has(elementId)) {
            const element = $(`#${elementId}`);
            if (element.length) {
                this.elementCache.set(elementId, element);
            }
        }
        return this.elementCache.get(elementId);
    }

     /**
     * Selects a UI element by selector and index
     * @param {string} selector - The CSS selector
     * @param {number} index - The index to select
     * @returns {boolean} - Success status of the operation
     */
     selectElementByIndex(selector, index) {
        try {
            const element = $(`${selector}:nth(${index})`);
            if (element.length) {
                element.click();
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error selecting element: ${selector}[${index}]`, error);
            return false;
        }
    }

    /**
     * Selects a timeframe element
     * @param {number} index - The timeframe index
     * @returns {boolean} - Success status of the operation
     */
    selectTimeframe(index) {
        return this.selectElementByIndex(ToolbarConstants.TIMEFRAME_SELECTOR, index);
    }

    /**
     * Selects a toolbar element
     * @param {number} index - The toolbar index
     * @returns {boolean} - Success status of the operation
     */
    selectToolbar(index) {
        return this.selectElementByIndex(ToolbarConstants.TOOLBAR_SELECTOR, index);
    }
}