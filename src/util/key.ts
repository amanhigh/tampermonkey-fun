import { ISyncUtil } from './sync';

export interface IDoubleKeyState {
  init: boolean;
  begin: boolean;
  end: boolean;
}

/**
 * Interface for keyboard input detection and state management
 */
export interface IKeyUtil {
  /**
   * Checks if any modifier key is pressed
   * @param event - Keyboard event to check
   * @returns True if any modifier key is pressed
   */
  hasModifierKey(event: KeyboardEvent): boolean;

  /**
   * Gets the type of modifier key pressed
   * @param event - Keyboard event to check
   * @returns Type of modifier key or null if none
   */
  getModifierType(event: KeyboardEvent): 'ctrl' | 'shift' | 'alt' | null;

  /**
   * Detects double key press within few milliseconds
   * Timeline NoKey-->Init-->Begin-->End-->
   * W1: Starts Init
   * W2: Resets Init
   * W3: Double Key Recorded
   * W4: Restart From Init
   * @param event - Keyboard event
   * @returns True if double key detected
   */
  isDoubleKey(event: KeyboardEvent): boolean;

  /**
   * Check if modifier key combination matches
   * @param modifierActive Whether modifier key is active
   * @param key Target key to check
   * @param event Keyboard event
   * @returns True if combination matches
   */
  isModifierKeyPressed(modifierActive: boolean, key: string, event: KeyboardEvent): boolean;
}

/**
 * Manages keyboard input detection and state
 */
export class KeyUtil implements IKeyUtil {
  private readonly _syncUtil: ISyncUtil;
  private readonly _doubleKeyState: IDoubleKeyState;

  /**
   * @param syncUtil - Instance of SyncUtil for coordination
   */
  constructor(syncUtil: ISyncUtil) {
    this._syncUtil = syncUtil;
    this._doubleKeyState = {
      init: false,
      begin: false,
      end: false,
    };
  }

  /** @inheritdoc */
  public hasModifierKey(event: KeyboardEvent): boolean {
    if (!event || !(event instanceof KeyboardEvent)) {
      console.error('Invalid keyboard event provided to hasModifierKey');
      return false;
    }
    return event.ctrlKey || event.shiftKey || event.altKey;
  }

  /** @inheritdoc */
  public getModifierType(event: KeyboardEvent): 'ctrl' | 'shift' | 'alt' | null {
    if (!event || !(event instanceof KeyboardEvent)) {
      console.error('Invalid keyboard event provided to getModifierType');
      return null;
    }

    if (event.ctrlKey) {
      return 'ctrl';
    }
    if (event.shiftKey) {
      return 'shift';
    }
    if (event.altKey) {
      return 'alt';
    }
    return null;
  }

  /** @inheritdoc */
  public isDoubleKey(event: KeyboardEvent): boolean {
    if (!event || !(event instanceof KeyboardEvent)) {
      console.error('Invalid keyboard event provided to isDoubleKey');
      return false;
    }

    // Check if key came not too fast and not too slow
    if (this._doubleKeyState.init && this._doubleKeyState.begin && !this._doubleKeyState.end && !event.repeat) {
      return true;
    }

    // After Init Before Begin; Reset Init
    else if (this._doubleKeyState.init) {
      this._doubleKeyState.init = this._doubleKeyState.begin;
    }

    // Before Init
    else {
      this._doubleKeyState.init = true;
      this._doubleKeyState.begin = this._doubleKeyState.end = false;
      // W1: Enter Begin (Too Fast Keys Filtered)
      this._syncUtil.waitOn('fastDoubleKeyInput', 50, () => {
        this._doubleKeyState.begin = true;
      });
      // W4: Reached End Reset Process
      this._syncUtil.waitOn('doubleKeyInput', 200, () => {
        this._doubleKeyState.end = true;
        this._doubleKeyState.init = false;
      });
    }
    return false;
  }

  /** @inheritdoc */
  public isModifierKeyPressed(modifierActive: boolean, key: string, event: KeyboardEvent): boolean {
    return modifierActive && event.key.toLowerCase() === key;
  }
}
