/**
 * Handles keyboard events and routes them to appropriate actions
 */
class HotkeyHandler {
    /**
     * @param {TradingViewActionManager} tvActionManager - Trading view action manager
     * @param {KeyUtil} keyUtil - Key utility for detection
     * @param {KeyConfig} keyConfig - Key configuration and actions
     */
    constructor(tvActionManager, keyUtil, keyConfig, modifierKeyConfig) {
        this._tvActionManager = tvActionManager;
        this._keyUtil = keyUtil;
        this._keyConfig = keyConfig;
        this._modifierKeyConfig = modifierKeyConfig;
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
     * Handle keys when swift is enabled
     * @private
     * @param {KeyboardEvent} event Keyboard event
     */
    _handleSwiftEnabled(event) {
        if (this._keyUtil.hasModifierKey(event)) {
            this._handleModifierKeys(event);
        } else {
            this._handleNonModifierKeys(event);
        }
    }

    /**
     * Handle modifier key combinations
     * @private
     * @param {KeyboardEvent} event Keyboard event
     */
    _handleModifierKeys(event) {
        const modifierType = this._keyUtil.getModifierType(event);
        switch(modifierType) {
            case 'ctrl':
                this._modifierKeyConfig.executeCtrlAction(event.key);
                break;
            case 'shift':
                this._modifierKeyConfig.executeShiftAction(event.key);
                break;
            case 'alt':
                this._modifierKeyConfig.executeAltAction(event.key);
                break;
        }
    }

    /**
     * Handle non-modifier key presses
     * @private
     * @param {KeyboardEvent} event Keyboard event
     */
    _handleNonModifierKeys(event) {
        const handled = this._keyConfig.executeToolbarAction(event.key) ||
                       this._keyConfig.executeTimeframeAction(event.key) ||
                       this._keyConfig.executeOrderAction(event.key) ||
                       this._keyConfig.executeFlagAction(event.key) ||
                       this._keyConfig.executeUtilityAction(event.key);

        if (handled) {
            event.preventDefault();
        }
    }

    /**
     * Handle globally active keys (when swift is disabled)
     * @private
     * @param {KeyboardEvent} event Keyboard event
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
                this._tvActionManager.setSwiftEnabled(
                    !this._tvActionManager.isSwiftEnabled()
                );
            }
        }
        // Disable Swift Keys
        if (this._keyUtil.isModifierKey(event.altKey, 'b', event)) {
            this._tvActionManager.setSwiftEnabled(false);
        }
    }

    /**
     * Checks if swift should auto-enable for timeframe keys
     * @private
     * @param {KeyboardEvent} event Keyboard event
     * @param {boolean} currentlyEnabled Current swift state
     * @returns {boolean} True if should auto-enable
     */
    _shouldAutoEnableSwift(event, currentlyEnabled) {
        return !currentlyEnabled && 
               event.keyCode > 48 && 
               event.keyCode < 53;
    }
}