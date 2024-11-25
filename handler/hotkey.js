/**
 * Keyboard event handling for trading actions
 */
class HotkeyHandler {
    /**
     * @param {TradingViewActionManager} tvActionManager - Trading view action manager
     * @param {KeyUtil} keyUtil - Key utility for detection
     */
    constructor(tvActionManager, keyUtil) {
        this._tvActionManager = tvActionManager;
        this._keyUtil = keyUtil;
    }

    /**
     * Core keyboard event handler
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        try {
            const swiftEnabled = this._tvActionManager.isSwiftEnabled();
            
            // Auto-enable swift for timeframe keys (1-4)
            if (this._shouldAutoEnableSwift(event, swiftEnabled)) {
                this._tvActionManager.setSwiftEnabled(true);
                // TODO: Add Message Display
                return;
            }

            // Main key handling based on swift state
            if (swiftEnabled) {
                this._handleSwiftEnabled(event);
                return;
            }

            // Handle always-active keys
            this._handleGlobalKeys(event);
        } catch (error) {
            console.error('Error in handleKeyDown:', error);
        }
    }

    /**
     * Checks if swift should auto-enable for timeframe keys
     * @private
     */
    _shouldAutoEnableSwift(event, currentlyEnabled) {
        return !currentlyEnabled && 
               event.keyCode > 48 && 
               event.keyCode < 53;
    }

    /**
     * Handle keys when swift is enabled
     * @private
     */
    _handleSwiftEnabled(event) {
        // Temporary: delegate to existing nonModifierKey function
        nonModifierKey(event);
    }

    /**
     * Handle globally active keys
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {void} 
     */
    _handleGlobalKeys(event) {
        // Flag/Unflag
        if (this._keyUtil.isModifierKey(event.shiftKey, 'o', event)) {
            this._tvActionManager.toggleFlag();
        }
        // Focus Input
        if (this._keyUtil.isModifierKey(event.ctrlKey, 'b', event)) {
            this._tvActionManager.focusCommandInput();
        }
        // Close Text Box and Enable Swift
        if (this._keyUtil.isModifierKey(event.shiftKey, 'enter', event)) {
            this._tvActionManager.closeTextBox();
            this._tvActionManager.setSwiftEnabled(true);
        }
        // Double Shift for Swift Toggle
        if (event.key === 'Shift') {
            if (this._keyUtil.isDoubleKey(event)) {
                this._tvActionManager.setSwiftEnabled(!this._tvActionManager.isSwiftEnabled());
            }
        }

        // Disable Swift Keys
        if (this._keyUtil.isModifierKey(event.altKey, 'b', event)) {
            this._tvActionManager.setSwiftEnabled(false);
        }
    }
}