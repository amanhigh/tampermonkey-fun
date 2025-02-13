import { Constants } from '../models/constant';
import { ITimeFrameManager } from '../manager/timeframe';
import { ISequenceManager } from '../manager/sequence';
import { IStyleManager } from '../manager/style';
import { IWatchListHandler } from '../handler/watchlist';
import { IFlagHandler } from '../handler/flag';
import { IJournalHandler } from './journal';
import { IKiteHandler } from './kite';

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
/**
 * Interface for managing hotkey configurations and actions
 */
export interface IKeyConfig {
  /**
   * Execute toolbar key action if defined
   * @param key Key pressed
   * @returns True if action was executed
   */
  executeToolbarAction(key: string): boolean;

  /**
   * Execute timeframe key action if defined
   * @param key Key pressed
   * @returns True if action was executed
   */
  executeTimeframeAction(key: string): boolean;

  /**
   * Execute order key action if defined
   * @param key Key pressed
   * @returns True if action was executed
   */
  executeOrderAction(key: string): boolean;

  /**
   * Execute flag key action if defined
   * @param key Key pressed
   * @returns True if action was executed
   */
  executeFlagAction(key: string): boolean;

  /**
   * Execute utility key action if defined
   * @param key Key pressed
   * @returns True if action was executed
   */
  executeUtilityAction(key: string): boolean;

  /**
   * Get description for given key if bound
   * @param key Key to get description for
   * @returns Description string if found
   */
  getDescription(key: string): string | undefined;
}

export class KeyConfig implements IKeyConfig {
  private readonly toolbarKeys: KeyMap;
  private readonly timeframeKeys: KeyMap;
  private readonly orderKeys: KeyMap;
  private readonly flagKeys: KeyMap;
  private readonly utilityKeys: KeyMap;

  /**
   * @param sequenceManager Sequence manager for timeframes
   * @param timeFrameManager Timeframe operations manager
   * @param watchlistHandler Watchlist handler
   * @param flagHandler Flag handler
   * @param styleManager Style operations manager
   */
  // eslint-disable-next-line max-lines-per-function, max-params
  constructor(
    private readonly sequenceManager: ISequenceManager,
    private readonly timeFrameManager: ITimeFrameManager,
    private readonly watchlistHandler: IWatchListHandler,
    private readonly flagHandler: IFlagHandler,
    private readonly styleManager: IStyleManager,
    private readonly journalHandler: IJournalHandler,
    private readonly kiteHandler: IKiteHandler
  ) {
    this.toolbarKeys = new Map([
      [
        ',',
        {
          description: 'TrendLine',
          action: () => this.styleManager.selectToolbar(1),
        },
      ],
      [
        'e',
        {
          description: 'FibZone',
          action: () => this.styleManager.selectToolbar(2),
        },
      ],
      [
        '.',
        {
          description: 'Rectangle',
          action: () => this.styleManager.selectToolbar(3),
        },
      ],
      [
        'k',
        {
          description: 'Text with Reason',
          action: () => {
            void this.journalHandler.handleJournalReasonPrompt();
          },
        },
      ],
      [
        'j',
        {
          description: 'Demand Zone',
          action: () => this.styleManager.applyZoneStyle(Constants.TRADING.ZONES.DEMAND),
        },
      ],
      [
        'u',
        {
          description: 'Supply Zone',
          action: () => this.styleManager.applyZoneStyle(Constants.TRADING.ZONES.SUPPLY),
        },
      ],
      [
        'p',
        {
          description: 'Clear All',
          action: () => this.styleManager.clearAll(),
        },
      ],
      [
        't',
        {
          description: 'Trade',
          action: () => void this.kiteHandler.handleGttOrderButton(),
        },
      ],
    ]);

    this.timeframeKeys = new Map([
      [
        '0',
        {
          description: 'Freeze Sequence',
          action: () => this.sequenceManager.toggleFreezeSequence(),
        },
      ],
      [
        '1',
        {
          description: 'VHTF (Very High Timeframe)',
          action: () => this.timeFrameManager.applyTimeFrame(0),
        },
      ],
      [
        '2',
        {
          description: 'HTF (High Timeframe)',
          action: () => this.timeFrameManager.applyTimeFrame(1),
        },
      ],
      [
        '3',
        {
          description: 'ITF (Intermediate Timeframe)',
          action: () => this.timeFrameManager.applyTimeFrame(2),
        },
      ],
      [
        '4',
        {
          description: 'TTF (Trading Timeframe)',
          action: () => this.timeFrameManager.applyTimeFrame(3),
        },
      ],
    ]);

    this.orderKeys = new Map([
      [
        'F1',
        {
          description: 'Order List - Index 0',
          action: () => this.watchlistHandler.recordSelectedTicker(0),
        },
      ],
      [
        'F2',
        {
          description: 'Order List - Index 1',
          action: () => this.watchlistHandler.recordSelectedTicker(1),
        },
      ],
      [
        'F3',
        {
          description: 'Order List - Index 2',
          action: () => this.watchlistHandler.recordSelectedTicker(2),
        },
      ],
      [
        'F4',
        {
          description: 'Order List - Index 3',
          action: () => this.watchlistHandler.recordSelectedTicker(3),
        },
      ],
      [
        'F5',
        {
          description: 'Order List - Index 4',
          action: () => this.watchlistHandler.recordSelectedTicker(4),
        },
      ],
    ]);

    this.flagKeys = new Map([
      [
        'F6',
        {
          description: 'Orange Consolidation Flag - Index 0',
          action: () => this.flagHandler.recordSelectedTicker(0),
        },
      ],
      [
        'F7',
        {
          description: 'Red Shorts Flag - Index 1',
          action: () => this.flagHandler.recordSelectedTicker(1),
        },
      ],
      [
        'F8',
        {
          description: 'Blue Crypto Flag - Index 2',
          action: () => this.flagHandler.recordSelectedTicker(2),
        },
      ],
      [
        'F9',
        {
          description: 'Empty Flag - Index 3',
          action: () => this.flagHandler.recordSelectedTicker(3),
        },
      ],
      [
        'F10',
        {
          description: 'Green Longs Flag - Index 4',
          action: () => this.flagHandler.recordSelectedTicker(4),
        },
      ],
      [
        'F11',
        {
          description: 'Normal Composite - Index 6',
          action: () => this.watchlistHandler.recordSelectedTicker(6),
        },
      ],
      [
        'F12',
        {
          description: 'Golden Composite - Index 7',
          action: () => this.watchlistHandler.recordSelectedTicker(7),
        },
      ],
    ]);

    this.utilityKeys = new Map([
      [
        "'",
        {
          description: 'Undo',
          action: () => document.execCommand('undo', false),
        },
      ],
    ]);
  }

  /**
   * Execute toolbar key action if defined
   */
  executeToolbarAction(key: string): boolean {
    return this._executeAction(this.toolbarKeys, key);
  }

  /**
   * Execute timeframe key action if defined
   */
  executeTimeframeAction(key: string): boolean {
    return this._executeAction(this.timeframeKeys, key);
  }

  /**
   * Execute order key action if defined
   */
  executeOrderAction(key: string): boolean {
    return this._executeAction(this.orderKeys, key);
  }

  /**
   * Execute flag key action if defined
   */
  executeFlagAction(key: string): boolean {
    return this._executeAction(this.flagKeys, key);
  }

  /**
   * Execute utility key action if defined
   */
  executeUtilityAction(key: string): boolean {
    return this._executeAction(this.utilityKeys, key);
  }

  /**
   * Get description for given key if bound
   */
  getDescription(key: string): string | undefined {
    const binding =
      this.toolbarKeys.get(key) ||
      this.timeframeKeys.get(key) ||
      this.orderKeys.get(key) ||
      this.flagKeys.get(key) ||
      this.utilityKeys.get(key);
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
