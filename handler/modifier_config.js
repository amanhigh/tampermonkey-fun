/**
 * Manages modifier key combinations and their actions
 */
class ModifierKeyConfig {
    /**
     * @param {TradingViewActionManager} tvActionManager
     * @param {CategoryManager} categoryManager
     * @param {TradingViewManager} tvManager
     */
    constructor(tvActionManager, categoryManager, tvManager) {
        // CTRL modifier actions
        this._ctrlKeys = new Map([
            ['e', {
                description: 'Long Position',
                action: () => tvActionManager.selectToolbar(6)
            }],
            ['m', {
                description: 'Auto Alert Create',
                // TODO: Fix AlertCreateSmart()
                action: () => tvActionManager.createAlert()
            }],
            ['r', {
                // TODO: Fix AlertSmartDelete()
                description: 'Auto Alert Delete',
                action: () => tvActionManager.deleteAlert()
            }],
            ['f12', {
                description: 'Mark Index',
                action: () => categoryManager.recordOrderCategory(6)
            }],
            ['f11', {
                description: 'Mark Composite',
                action: () => categoryManager.recordOrderCategory(7)
            }]
        ]);

        // SHIFT modifier actions
        this._shiftKeys = new Map([
            ['e', {
                description: 'Short Position',
                action: () => tvActionManager.selectToolbar(7)
            }],
            ['q', {
                description: 'Relative Chart',
                action: () => tvActionManager.openBenchmarkTicker()
            }],
            ['p', {
                description: 'Alert Reset (without Lines)',
                // TODO: Fix broken function
                action: () => tvActionManager.resetAlerts()
            }]
        ]);

        // ALT modifier actions
        this._altKeys = new Map([
            ['t', {
                description: 'Navigate Previous',
                action: () => tvManager.navigateTickers(-1)
            }],
            ['d', {
                description: 'Navigate Next',
                action: () => tvManager.navigateTickers(1)
            }]
        ]);
    }

    /**
     * Execute ctrl key action
     * @param {string} key Key pressed
     * @returns {boolean} True if action executed
     */
    executeCtrlAction(key) {
        return this._executeAction(this._ctrlKeys, key);
    }

    /**
     * Execute shift key action
     * @param {string} key Key pressed
     * @returns {boolean} True if action executed
     */
    executeShiftAction(key) {
        return this._executeAction(this._shiftKeys, key);
    }

    /**
     * Execute alt key action
     * @param {string} key Key pressed
     * @returns {boolean} True if action executed
     */
    executeAltAction(key) {
        return this._executeAction(this._altKeys, key);
    }

    /**
     * Get description for a key combination
     * @param {string} modifier Modifier type (ctrl, shift, alt)
     * @param {string} key Key
     * @returns {string|undefined} Action description
     */
    getDescription(modifier, key) {
        let map;
        switch(modifier) {
            case 'ctrl': map = this._ctrlKeys; break;
            case 'shift': map = this._shiftKeys; break;
            case 'alt': map = this._altKeys; break;
            default: return undefined;
        }
        return map.get(key)?.description;
    }

    /**
     * Execute action from map if found
     * @private
     */
    _executeAction(map, key) {
        const binding = map.get(key.toLowerCase());
        if (binding) {
            binding.action();
            return true;
        }
        return false;
    }
}