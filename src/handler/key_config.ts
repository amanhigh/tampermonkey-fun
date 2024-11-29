import { Constants } from '../models/constant';

/**
 * Type definitions for key bindings and actions
 */
type KeyBinding = {
    description: string;
    action: () => void;
};

type KeyMap = Map<string, KeyBinding>;

/**
 * Manages hotkey configuration and actions
 */
export class KeyConfig {
    private readonly _toolbarKeys: KeyMap;
    private readonly _timeframeKeys: KeyMap;
    private readonly _orderKeys: KeyMap;
    private readonly _flagKeys: KeyMap;
    private readonly _utilityKeys: KeyMap;

    /**
     * @param tvActionManager Trading view action manager
     * @param sequenceManager Sequence manager for timeframes
     * @param categoryManager Category manager for orders and flags
     */
    // eslint-disable-next-line max-lines-per-function
    constructor(
        private readonly _tvActionManager: ITradingViewActionManager,
        private readonly _sequenceManager: ISequenceManager,
        private readonly _categoryManager: ICategoryManager
    ) {
        this._toolbarKeys = new Map([
            [',', {
                description: 'TrendLine',
                action: () => _tvActionManager.selectToolbar(1)
            }],
            ['e', {
                description: 'FibZone',
                action: () => _tvActionManager.selectToolbar(2)
            }],
            ['.', {
                description: 'Rectangle',
                action: () => _tvActionManager.selectToolbar(3)
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
                action: () => _tvActionManager.handleReasonPrompt()
            }],
            ['j', {
                description: 'Demand Zone',
                action: () => _tvActionManager.selectZoneStyle(Constants.TRADING.ZONES.DEMAND)
            }],
            ['u', {
                description: 'Supply Zone',
                action: () => _tvActionManager.selectZoneStyle(Constants.TRADING.ZONES.SUPPLY)
            }],
            ['p', {
                description: 'Clear All',
                action: () => _tvActionManager.clearAll()
            }],
            ['t', {
                description: 'Trade',
                action: () => _tvActionManager.handleGttOrder()
            }]
        ]);

        this._timeframeKeys = new Map([
            ['0', {
                description: 'Freeze Sequence',
                action: () => _sequenceManager.freezeSequence()
            }],
            ['1', {
                description: 'VHTF (Very High Timeframe)',
                action: () => _sequenceManager.selectTimeframe(0)
            }],
            ['2', {
                description: 'HTF (High Timeframe)',
                action: () => _sequenceManager.selectTimeframe(1)
            }],
            ['3', {
                description: 'ITF (Intermediate Timeframe)',
                action: () => _sequenceManager.selectTimeframe(2)
            }],
            ['4', {
                description: 'TTF (Trading Timeframe)',
                action: () => _sequenceManager.selectTimeframe(3)
            }]
        ]);

        this._orderKeys = new Map([
            ['F1', {
                description: 'Order List - Index 0',
                // Todo: Requires Selected Ticker
                action: () => _categoryManager.recordOrderCategory(0)
            }],
            ['F2', {
                description: 'Order List - Index 1',
                action: () => _categoryManager.recordOrderCategory(1)
            }],
            ['F3', {
                description: 'Order List - Index 2',
                action: () => _categoryManager.recordOrderCategory(2)
            }],
            ['F4', {
                description: 'Order List - Index 3',
                action: () => _categoryManager.recordOrderCategory(3)
            }],
            ['F5', {
                description: 'Order List - Index 4',
                action: () => _categoryManager.recordOrderCategory(4)
            }]
        ]);
            
        this._flagKeys = new Map([
            ['F6', {
                description: 'Orange Consolidation Flag - Index 0',
                action: () => _categoryManager.recordFlagCategory(0)
            }],
            ['F7', {
                description: 'Red Shorts Flag - Index 1',
                action: () => _categoryManager.recordFlagCategory(1)
            }],
            ['F8', {
                description: 'Blue Crypto Flag - Index 2',
                action: () => _categoryManager.recordFlagCategory(2)
            }],
            ['F9', {
                description: 'Empty Flag - Index 3',
                action: () => _categoryManager.recordFlagCategory(3)
            }],
            ['F10', {
                description: 'Green Longs Flag - Index 4',
                action: () => _categoryManager.recordFlagCategory(4)
            }],
            ['F11', {
                description: 'Brown Index Flag - Index 6',
                action: () => _categoryManager.recordFlagCategory(6)
            }],
            ['F12', {
                description: 'Golden XAU Flag - Index 7',
                action: () => _categoryManager.recordFlagCategory(7)
            }]
        ]);

        this._utilityKeys = new Map([
            ["'", {
                description: 'Undo',
                action: () => document.execCommand('undo', false, null)
            }]
        ]);
    }

    /**
     * Execute toolbar key action if defined
     */
    executeToolbarAction(key: string): boolean {
        return this._executeAction(this._toolbarKeys, key);
    }

    /**
     * Execute timeframe key action if defined
     */
    executeTimeframeAction(key: string): boolean {
        return this._executeAction(this._timeframeKeys, key);
    }

    /**
     * Execute order key action if defined
     */
    executeOrderAction(key: string): boolean {
        return this._executeAction(this._orderKeys, key);
    }

    /**
     * Execute flag key action if defined
     */
    executeFlagAction(key: string): boolean {
        return this._executeAction(this._flagKeys, key);
    }

    /**
     * Execute utility key action if defined
     */
    executeUtilityAction(key: string): boolean {
        return this._executeAction(this._utilityKeys, key);
    }

    /**
     * Get description for given key if bound
     */
    getDescription(key: string): string | undefined {
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
    private _executeAction(map: KeyMap, key: string): boolean {
        const binding = map.get(key);
        if (binding) {
            binding.action();
            return true;
        }
        return false;
    }
}
