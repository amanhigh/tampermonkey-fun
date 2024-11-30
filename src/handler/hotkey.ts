import { IKeyUtil } from '../util/key';
import { IModifierKeyConfig } from './modifier_config';

/**
 * Interface for managing hotkey operations
 */
export interface IHotkeyHandler {
  /**
   * Core keyboard event handler
   * @param event Keyboard event
   */
  handleKeyDown(event: KeyboardEvent): void;
}

/**
 * Handles keyboard events and routes them to appropriate actions
 */
export class HotkeyHandler implements IHotkeyHandler {
  /**
   * @param keyUtil Key utility for detection
   * @param keyConfig Key configuration and actions
   * @param modifierKeyConfig Configuration for modifier keys
   */
  constructor(
    private readonly _keyUtil: IKeyUtil,
    private readonly _keyConfig: IKeyConfig,
    private readonly _modifierKeyConfig: IModifierKeyConfig
  ) {}

  /** @inheritdoc */
  handleKeyDown(event: KeyboardEvent): void {
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
   * @param event Keyboard event
   */
  private _handleSwiftEnabled(event: KeyboardEvent): void {
    if (this._keyUtil.hasModifierKey(event)) {
      this._handleModifierKeys(event);
    } else {
      this._handleNonModifierKeys(event);
    }
  }

  /**
   * Handle modifier key combinations
   * @private
   * @param event Keyboard event
   */
  private _handleModifierKeys(event: KeyboardEvent): void {
    const modifierType = this._keyUtil.getModifierType(event);
    switch (modifierType) {
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
   * @param event Keyboard event
   */
  private _handleNonModifierKeys(event: KeyboardEvent): void {
    const handled =
      this._keyConfig.executeToolbarAction(event.key) ||
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
   * @param event Keyboard event
   */
  private _handleGlobalKeys(event: KeyboardEvent): void {
    // Flag/Unflag
    if (this._isModifierKey(event.shiftKey, 'o', event)) {
      this._tvActionManager.toggleFlag();
    }
    // Focus Input
    if (this._isModifierKey(event.ctrlKey, 'b', event)) {
      this._tvActionManager.focusCommandInput();
    }
    // Close Text Box and Enable Swift
    if (this._isModifierKey(event.shiftKey, 'enter', event)) {
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
    if (this._isModifierKey(event.altKey, 'b', event)) {
      this._tvActionManager.setSwiftEnabled(false);
    }
  }

  /**
   * Checks if swift should auto-enable for timeframe keys
   * @private
   * @param event Keyboard event
   * @param currentlyEnabled Current swift state
   * @returns True if should auto-enable
   */
  private _shouldAutoEnableSwift(event: KeyboardEvent, currentlyEnabled: boolean): boolean {
    return !currentlyEnabled && event.keyCode > 48 && event.keyCode < 53;
  }

  /**
   * Helper to check for modifier key combinations
   * @private
   * @param modifierActive Whether modifier key is active
   * @param key Target key to check
   * @param event Keyboard event
   * @returns True if combination matches
   */
  private _isModifierKey(modifierActive: boolean, key: string, event: KeyboardEvent): boolean {
    // FIXME: Use from Key Util
    return modifierActive && event.key.toLowerCase() === key;
  }
}
