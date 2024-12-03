import { Constants } from '../models/constant';
import { ITimeFrameManager } from '../manager/timeframe';
import { ISequenceManager } from '../manager/sequence';
import { IWatchManager } from '../manager/watch';
import { IFlagManager } from '../manager/flag';
import { IStyleManager } from '../manager/style';
import { ITradingViewManager } from '../manager/tv';

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
   * @param tvManager Trading view manager
   * @param sequenceManager Sequence manager for timeframes
   * @param timeFrameManager Timeframe operations manager
   * @param watchManager Watch category manager
   * @param flagManager Flag category manager
   * @param styleManager Style operations manager
   */
  // eslint-disable-next-line max-lines-per-function
  constructor(
    private readonly tvManager: ITradingViewManager,
    private readonly sequenceManager: ISequenceManager,
    private readonly timeFrameManager: ITimeFrameManager,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly styleManager: IStyleManager
  ) {
    this._toolbarKeys = new Map([
      [
        ',',
        {
          description: 'TrendLine',
          action: () => styleManager.selectToolbar(1),
        },
      ],
      [
        'e',
        {
          description: 'FibZone',
          action: () => styleManager.selectToolbar(2),
        },
      ],
      [
        '.',
        {
          description: 'Rectangle',
          action: () => styleManager.selectToolbar(3),
        },
      ],
      [
        'k',
        {
          description: 'Text with Reason',
          // TODO: Fix ReasonPrompt Integration. Legacy code for reference:
          /**
           * ReasonPrompt((reason) => {
           *   ClipboardCopy(timeFrame.symbol + " - " + reason);
           *   SelectToolbar(4);
           * })
           */
          action: () => console.warn('TODO: Integrate ReasonPrompt with clipboard and toolbar selection'),
        },
      ],
      [
        'j',
        {
          description: 'Demand Zone',
          action: () => styleManager.selectZoneStyle(Constants.TRADING.ZONES.DEMAND, ''), // TODO: Get current style
        },
      ],
      [
        'u',
        {
          description: 'Supply Zone',
          action: () => styleManager.selectZoneStyle(Constants.TRADING.ZONES.SUPPLY, ''), // TODO: Get current style
        },
      ],
      [
        'p',
        {
          description: 'Clear All',
          action: () => styleManager.clearAll(),
        },
      ],
      [
        't',
        {
          description: 'Trade',
          // TODO: Fix GTT Order Integration
          action: () => console.warn('TODO: Integrate GTT Order handling'),
        },
      ],
    ]);

    this._timeframeKeys = new Map([
      [
        '0',
        {
          description: 'Freeze Sequence',
          action: () => sequenceManager.toggleFreezeSequence(),
        },
      ],
      [
        '1',
        {
          description: 'VHTF (Very High Timeframe)',
          action: () => timeFrameManager.applyTimeFrame(0),
        },
      ],
      [
        '2',
        {
          description: 'HTF (High Timeframe)',
          action: () => timeFrameManager.applyTimeFrame(1),
        },
      ],
      [
        '3',
        {
          description: 'ITF (Intermediate Timeframe)',
          action: () => timeFrameManager.applyTimeFrame(2),
        },
      ],
      [
        '4',
        {
          description: 'TTF (Trading Timeframe)',
          action: () => timeFrameManager.applyTimeFrame(3),
        },
      ],
    ]);

    this._orderKeys = new Map([
      [
        'F1',
        {
          description: 'Order List - Index 0',
          action: () => watchManager.recordCategory(0),
        },
      ],
      [
        'F2',
        {
          description: 'Order List - Index 1',
          action: () => watchManager.recordCategory(1),
        },
      ],
      [
        'F3',
        {
          description: 'Order List - Index 2',
          action: () => watchManager.recordCategory(2),
        },
      ],
      [
        'F4',
        {
          description: 'Order List - Index 3',
          action: () => watchManager.recordCategory(3),
        },
      ],
      [
        'F5',
        {
          description: 'Order List - Index 4',
          action: () => watchManager.recordCategory(4),
        },
      ],
    ]);

    this._flagKeys = new Map([
      [
        'F6',
        {
          description: 'Orange Consolidation Flag - Index 0',
          action: () => flagManager.recordCategory(0),
        },
      ],
      [
        'F7',
        {
          description: 'Red Shorts Flag - Index 1',
          action: () => flagManager.recordCategory(1),
        },
      ],
      [
        'F8',
        {
          description: 'Blue Crypto Flag - Index 2',
          action: () => flagManager.recordCategory(2),
        },
      ],
      [
        'F9',
        {
          description: 'Empty Flag - Index 3',
          action: () => flagManager.recordCategory(3),
        },
      ],
      [
        'F10',
        {
          description: 'Green Longs Flag - Index 4',
          action: () => flagManager.recordCategory(4),
        },
      ],
      [
        'F11',
        {
          description: 'Brown Index Flag - Index 6',
          action: () => flagManager.recordCategory(6),
        },
      ],
      [
        'F12',
        {
          description: 'Golden XAU Flag - Index 7',
          action: () => flagManager.recordCategory(7),
        },
      ],
    ]);

    this._utilityKeys = new Map([
      [
        "'",
        {
          description: 'Undo',
          action: () => document.execCommand('undo', false, null),
        },
      ],
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
    const binding =
      this._toolbarKeys.get(key) ||
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
