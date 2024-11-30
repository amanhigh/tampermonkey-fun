import { ICategoryManager } from '../manager/category';
import { ITradingViewManager } from '../manager/tv';

/**
 * Type definition for key bindings
 */
type KeyBinding = {
  description: string;
  action: () => void;
};

// HACK: Duplicate with key_config
type KeyMap = Map<string, KeyBinding>;

/**
 * Interface for modifier key configuration operations
 */
export interface IModifierKeyConfig {
  /**
   * Execute ctrl key action
   * @param key Key pressed
   * @returns True if action executed
   */
  executeCtrlAction(key: string): boolean;

  /**
   * Execute shift key action
   * @param key Key pressed
   * @returns True if action executed
   */
  executeShiftAction(key: string): boolean;

  /**
   * Execute alt key action
   * @param key Key pressed
   * @returns True if action executed
   */
  executeAltAction(key: string): boolean;

  /**
   * Get description for a key combination
   * @param modifier Modifier type (ctrl, shift, alt)
   * @param key Key
   * @returns Action description
   */
  getDescription(modifier: 'ctrl' | 'shift' | 'alt', key: string): string | undefined;
}

/**
 * Manages modifier key combinations and their actions
 */
export class ModifierKeyConfig implements IModifierKeyConfig {
  private readonly _ctrlKeys: KeyMap;
  private readonly _shiftKeys: KeyMap;
  private readonly _altKeys: KeyMap;

  /**
   * @param categoryManager Manager for category operations
   * @param tvManager Manager for trading view operations
   */
  // eslint-disable-next-line max-lines-per-function
  constructor(
    private readonly _categoryManager: ICategoryManager,
    private readonly _tvManager: ITradingViewManager
  ) {
    // CTRL modifier actions
    this._ctrlKeys = new Map([
      [
        'e',
        {
          description: 'Long Position',
          action: () => _tvActionManager.selectToolbar(6),
        },
      ],
      [
        'm',
        {
          description: 'Auto Alert Create',
          // TODO: Fix AlertCreateSmart()
          action: () => _tvActionManager.createAlert(),
        },
      ],
      [
        'r',
        {
          // TODO: Fix AlertSmartDelete()
          description: 'Auto Alert Delete',
          action: () => _tvActionManager.deleteAlert(),
        },
      ],
      [
        'f12',
        {
          description: 'Mark Index',
          action: () => _categoryManager.recordOrderCategory(6),
        },
      ],
      [
        'f11',
        {
          description: 'Mark Composite',
          action: () => _categoryManager.recordOrderCategory(7),
        },
      ],
    ]);

    // SHIFT modifier actions
    this._shiftKeys = new Map([
      [
        'e',
        {
          description: 'Short Position',
          action: () => _tvActionManager.selectToolbar(7),
        },
      ],
      [
        'q',
        {
          description: 'Relative Chart',
          action: () => _tvActionManager.openBenchmarkTicker(),
        },
      ],
      [
        'p',
        {
          description: 'Alert Reset (without Lines)',
          // TODO: Fix broken function
          action: () => _tvActionManager.resetAlerts(),
        },
      ],
    ]);

    // ALT modifier actions
    this._altKeys = new Map([
      [
        't',
        {
          description: 'Navigate Previous',
          action: () => _tvManager.navigateTickers(-1),
        },
      ],
      [
        'd',
        {
          description: 'Navigate Next',
          action: () => _tvManager.navigateTickers(1),
        },
      ],
    ]);
  }

  /** @inheritdoc */
  executeCtrlAction(key: string): boolean {
    return this._executeAction(this._ctrlKeys, key);
  }

  /** @inheritdoc */
  executeShiftAction(key: string): boolean {
    return this._executeAction(this._shiftKeys, key);
  }

  /** @inheritdoc */
  executeAltAction(key: string): boolean {
    return this._executeAction(this._altKeys, key);
  }

  /** @inheritdoc */
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
  private _executeAction(map: KeyMap, key: string): boolean {
    const binding = map.get(key.toLowerCase());
    if (binding) {
      binding.action();
      return true;
    }
    return false;
  }
}
