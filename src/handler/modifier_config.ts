import { IStyleManager } from '../manager/style';
import { ITickerManager } from '../manager/ticker';
import { IAlertHandler } from './alert';
import { IFlagHandler } from './flag';
import { IWatchListHandler } from './watchlist';

/**
 * Type definitions for key bindings and actions
 */
type KeyBinding = {
  description: string;
  action: () => void;
};

type KeyMap = Map<string, KeyBinding>;

/**
 * Interface for modifier key configuration operations
 */
export interface IModifierKeyConfig {
  executeCtrlAction(key: string, event: KeyboardEvent): boolean;
  executeShiftAction(key: string, event: KeyboardEvent): boolean;
  executeAltAction(key: string, event: KeyboardEvent): boolean;
  getDescription(modifier: 'ctrl' | 'shift' | 'alt', key: string): string | undefined;
}

/**
 * Manages modifier key combinations and their actions
 */
export class ModifierKeyConfig implements IModifierKeyConfig {
  private readonly _ctrlKeys: KeyMap;
  private readonly _shiftKeys: KeyMap;
  private readonly _altKeys: KeyMap;

  // TASK Break Lines later for all eslint-disables
  // eslint-disable-next-line max-lines-per-function
  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly styleManager: IStyleManager,
    private readonly alertHandler: IAlertHandler,
    private readonly watchlistHandler: IWatchListHandler,
    private readonly flagHandler: IFlagHandler
  ) {
    // CTRL modifier actions
    this._ctrlKeys = new Map([
      [
        'e',
        {
          description: 'Long Position',
          action: () => this.styleManager.selectToolbar(6),
        },
      ],
      [
        'm',
        {
          description: 'Auto Alert Create',
          action: () => void this.alertHandler.createAlertAtCursor(),
        },
      ],
      [
        'r',
        {
          description: 'Auto Alert Delete',
          action: () => void this.alertHandler.deleteAlertAtCursor(),
        },
      ],
      [
        'f12',
        {
          description: 'Mark Index',
          action: () => this.watchlistHandler.recordSelectedTicker(6),
        },
      ],
      [
        'f11',
        {
          description: 'Mark Composite',
          action: () => this.watchlistHandler.recordSelectedTicker(7),
        },
      ],
      [
        'f7',
        {
          description: 'Flag Red Shorts',
          action: () => this.flagHandler.recordSelectedTicker(1),
        },
      ],
      [
        'f8',
        {
          description: 'Flag Blue Crypto',
          action: () => this.flagHandler.recordSelectedTicker(2),
        },
      ],
      [
        'f10',
        {
          description: 'Flag Green Longs',
          action: () => this.flagHandler.recordSelectedTicker(4),
        },
      ],
      [
        'f11',
        {
          description: 'Flag Brown Index',
          action: () => this.flagHandler.recordSelectedTicker(6),
        },
      ],
      [
        'f12',
        {
          description: 'Flag Golden XAU',
          action: () => this.flagHandler.recordSelectedTicker(7),
        },
      ],
    ]);

    // SHIFT modifier actions
    this._shiftKeys = new Map([
      [
        'e',
        {
          description: 'Short Position',
          action: () => this.styleManager.selectToolbar(7),
        },
      ],
      [
        'q',
        {
          description: 'Relative Chart',
          action: () => this.tickerManager.openBenchmarkTicker(),
        },
      ],
      [
        'p',
        {
          description: 'Alert Reset (without Lines)',
          action: () => void this.alertHandler.handleResetAlerts(),
        },
      ],
    ]);

    // ALT modifier actions
    this._altKeys = new Map([
      [
        't',
        {
          description: 'Navigate Previous',
          action: () => this.tickerManager.navigateTickers(-1),
        },
      ],
      [
        'd',
        {
          description: 'Navigate Next',
          action: () => this.tickerManager.navigateTickers(1),
        },
      ],
    ]);
  }

  executeCtrlAction(key: string, event: KeyboardEvent): boolean {
    return this._executeAction(this._ctrlKeys, key, event);
  }

  executeShiftAction(key: string, event: KeyboardEvent): boolean {
    return this._executeAction(this._shiftKeys, key, event);
  }

  executeAltAction(key: string, event: KeyboardEvent): boolean {
    return this._executeAction(this._altKeys, key, event);
  }

  getDescription(modifier: 'ctrl' | 'shift' | 'alt', key: string): string | undefined {
    let map: KeyMap;
    switch (modifier) {
      case 'ctrl':
        map = this._ctrlKeys;
        break;
      case 'shift':
        map = this._shiftKeys;
        break;
      case 'alt':
        map = this._altKeys;
        break;
      default:
        return undefined;
    }
    return map.get(key)?.description;
  }

  /**
   * Execute action from map if found
   * @private
   */
  private _executeAction(map: KeyMap, key: string, event: KeyboardEvent): boolean {
    const binding = map.get(key.toLowerCase());
    if (binding) {
      event.preventDefault();
      binding.action();
      return true;
    }
    return false;
  }
}
