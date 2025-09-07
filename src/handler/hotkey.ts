import { ITradingViewManager } from '../manager/tv';
import { IKeyUtil } from '../util/key';
import { Notifier } from '../util/notify';
import { IKeyConfig } from './key_config';
import { IModifierKeyConfig } from './modifier_config';
import { ICommandInputHandler } from './command';
import { ISwiftKeyHandler } from './swiftkey';

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
    private readonly keyUtil: IKeyUtil,
    private readonly keyConfig: IKeyConfig,
    private readonly modifierKeyConfig: IModifierKeyConfig,
    private readonly tvManager: ITradingViewManager,
    private readonly commandInputHandler: ICommandInputHandler,
    private readonly swiftKeyHandler: ISwiftKeyHandler
  ) {}

  /* @inheritdoc */
  handleKeyDown(event: KeyboardEvent): void {
    // Handle global keys first - these should work regardless of swift state
    if (this.handleGlobalKeys(event)) {
      event.preventDefault();
      return;
    }

    const swiftEnabled = this.tvManager.isSwiftKeysEnabled();

    // Auto-enable swift for timeframe keys (1-4)
    if (this.shouldAutoEnableSwift(event, swiftEnabled)) {
      void this.setSwiftKeysState(true);
      this.handleSwiftEnabled(event);
      return;
    }

    // Only handle swift-specific keys if enabled
    if (swiftEnabled) {
      this.handleSwiftEnabled(event);
    }
  }

  /**
   * Handle globally active keys that work regardless of swift state
   * @param event Keyboard event
   * @returns true if a global key was handled
   */
  private handleGlobalKeys(event: KeyboardEvent): boolean {
    // Flag/Unflag
    if (this.keyUtil.isModifierKeyPressed(event.shiftKey, 'o', event)) {
      this.tvManager.toggleFlag();
      return true;
    }

    // Focus Input
    if (this.keyUtil.isModifierKeyPressed(event.ctrlKey, 'b', event)) {
      this.commandInputHandler.focusCommandInput();
      return true;
    }

    // Close Text Box and Enable Swift
    if (this.keyUtil.isModifierKeyPressed(event.shiftKey, 'enter', event)) {
      this.tvManager.closeTextBox();
      void this.setSwiftKeysState(true);
      return true;
    }

    // Double Shift for Swift Toggle
    if (event.key === 'Shift' && this.keyUtil.isDoubleKey(event)) {
      const currentState = this.tvManager.isSwiftKeysEnabled();
      void this.setSwiftKeysState(!currentState);
      return true;
    }

    // Disable Swift Keys
    if (this.keyUtil.isModifierKeyPressed(event.altKey, 'b', event)) {
      void this.setSwiftKeysState(false);
      return true;
    }

    return false; // No global key was handled
  }

  /**
   * Handle keys when swift is enabled
   * @param event Keyboard event
   */
  private handleSwiftEnabled(event: KeyboardEvent): void {
    if (this.keyUtil.hasModifierKey(event)) {
      this.handleModifierKeys(event);
    } else {
      this.handleNonModifierKeys(event);
    }
  }

  /**
   * Handle modifier key combinations
   * @param event Keyboard event
   */
  private handleModifierKeys(event: KeyboardEvent): void {
    const modifierType = this.keyUtil.getModifierType(event);
    switch (modifierType) {
      case 'ctrl':
        this.modifierKeyConfig.executeCtrlAction(event.key, event);
        break;
      case 'shift':
        this.modifierKeyConfig.executeShiftAction(event.key, event);
        break;
      case 'alt':
        this.modifierKeyConfig.executeAltAction(event.key, event);
        break;
    }
  }

  /**
   * Handle non-modifier key presses
   * @param event Keyboard event
   */
  private handleNonModifierKeys(event: KeyboardEvent): void {
    const handled =
      this.keyConfig.executeToolbarAction(event.key) ||
      this.keyConfig.executeTimeframeAction(event.key) ||
      this.keyConfig.executeOrderAction(event.key) ||
      this.keyConfig.executeFlagAction(event.key) ||
      this.keyConfig.executeUtilityAction(event.key);

    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Checks if swift should auto-enable for timeframe keys
   * @param event Keyboard event
   * @param currentlyEnabled Current swift state
   * @returns True if should auto-enable
   */
  private shouldAutoEnableSwift(event: KeyboardEvent, currentlyEnabled: boolean): boolean {
    return !currentlyEnabled && event.keyCode > 48 && event.keyCode < 53;
  }

  /**
   * Set Swift Key State and Show Notification
   * @param enable true to enable
   */
  private async setSwiftKeysState(enable: boolean): Promise<void> {
    try {
      await this.swiftKeyHandler.setSwiftKeysState(enable);
      if (enable) {
        Notifier.success('🚀 Swift Enabled');
      } else {
        Notifier.red('🚧 Swift Disabled');
      }
    } catch (error) {
      console.error('SwiftKey state change failed:', error);
      Notifier.error('SwiftKey toggle failed');
    }
  }
}
