/**
 * Manages hotkey configuration and actions
 */
class KeyConfig {
    /**
     * @typedef {Object} KeyBinding
     * @property {string} key - Key identifier
     * @property {string} description - Action description
     * @property {Function} action - Function to execute
     */

    /**
     * @param {TradingViewActionManager} tvActionManager
     * @param {SequenceManager} sequenceManager
     * @param {CategoryManager} categoryManager
     */
    constructor(tvActionManager, sequenceManager, categoryManager) {
        this._toolbarKeys = new Map([
            [',', {
                description: 'TrendLine',
                action: () => tvActionManager.selectToolbar(1)
            }],
            ['e', {
                description: 'FibZone',
                action: () => tvActionManager.selectToolbar(2)
            }],
            ['.', {
                description: 'Rectangle',
                action: () => tvActionManager.selectToolbar(3)
            }],
            ['k', {
                description: 'Text with Reason',
                // TODO: Fix now Broken functions migrated.
                /**
                     * ReasonPrompt((reason) => {
                    ClipboardCopy(timeFrame.symbol + " - " + reason);
                    SelectToolbar(4);
                })
                 */
                action: () => tvActionManager.handleReasonPrompt()
            }],
            ['j', {
                description: 'Demand Zone',
                action: () => tvActionManager.selectZoneStyle(Constants.TRADING.ZONES.DEMAND)
            }],
            ['u', {
                description: 'Supply Zone',
                action: () => tvActionManager.selectZoneStyle(Constants.TRADING.ZONES.SUPPLY)
            }],
            ['p', {
                description: 'Clear All',
                action: () => tvActionManager.clearAll()
            }],
            ['t', {
                description: 'Trade',
                action: () => tvActionManager.handleGttOrder()
            }]
        ]);

        this._timeframeKeys = new Map([
            ['0', {
                description: 'Freeze Sequence',
                action: () => sequenceManager.freezeSequence()
            }],
            ['1', {
                description: 'VHTF (Very High Timeframe)',
                action: () => sequenceManager.selectTimeframe(0)
            }],
            ['2', {
                description: 'HTF (High Timeframe)',
                action: () => sequenceManager.selectTimeframe(1)
            }],
            ['3', {
                description: 'ITF (Intermediate Timeframe)',
                action: () => sequenceManager.selectTimeframe(2)
            }],
            ['4', {
                description: 'TTF (Trading Timeframe)',
                action: () => sequenceManager.selectTimeframe(3)
            }]
        ]);

        this._orderKeys = new Map([
            ['F1', {
                description: 'Order List - Index 0',
                // Todo: Requires Selected Ticker
                action: () => categoryManager.recordOrderCategory(0)
            }],
            ['F2', {
                description: 'Order List - Index 1',
                action: () => categoryManager.recordOrderCategory(1)
            }],
            ['F3', {
                description: 'Order List - Index 2',
                action: () => categoryManager.recordOrderCategory(2)
            }],
            ['F4', {
                description: 'Order List - Index 3',
                action: () => categoryManager.recordOrderCategory(3)
            }],
            ['F5', {
                description: 'Order List - Index 4',
                action: () => categoryManager.recordOrderCategory(4)
            }]
        ]);
            
        this._flagKeys = new Map([
            ['F6', {
                description: 'Orange Consolidation Flag - Index 0',
                action: () => categoryManager.recordFlagCategory(0)
            }],
            ['F7', {
                description: 'Red Shorts Flag - Index 1',
                action: () => categoryManager.recordFlagCategory(1)
            }],
            ['F8', {
                description: 'Blue Crypto Flag - Index 2',
                action: () => categoryManager.recordFlagCategory(2)
            }],
            ['F9', {
                description: 'Empty Flag - Index 3',
                action: () => categoryManager.recordFlagCategory(3)
            }],
            ['F10', {
                description: 'Green Longs Flag - Index 4',
                action: () => categoryManager.recordFlagCategory(4)
            }],
            ['F11', {
                description: 'Brown Index Flag - Index 6',
                action: () => categoryManager.recordFlagCategory(6)
            }],
            ['F12', {
                description: 'Golden XAU Flag - Index 7',
                action: () => categoryManager.recordFlagCategory(7)
            }]
        ]);

        this._utilityKeys = new Map([
            ["'", {
                description: 'Undo',
                action: () => document.execCommand('undo', false, null)
            }]
        ]);
    }

    executeToolbarAction(key) {
        return this._executeAction(this._toolbarKeys, key);
    }

    executeTimeframeAction(key) {
        return this._executeAction(this._timeframeKeys, key);
    }

    executeOrderAction(key) {
        return this._executeAction(this._orderKeys, key);
    }

    executeFlagAction(key) {
        return this._executeAction(this._flagKeys, key);
    }

    executeUtilityAction(key) {
        return this._executeAction(this._utilityKeys, key);
    }

    getDescription(key) {
        const binding = this._toolbarKeys.get(key) || 
                       this._timeframeKeys.get(key) || 
                       this._orderKeys.get(key) ||
                       this._flagKeys.get(key) ||
                       this._utilityKeys.get(key);
        return binding?.description;
    }

    /**
     * Execute action from map if found
     * @private
     */
    _executeAction(map, key) {
        const binding = map.get(key);
        if (binding) {
            binding.action();
            return true;
        }
        return false;
    }
}