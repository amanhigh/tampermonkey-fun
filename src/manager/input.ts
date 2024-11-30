import { Constants } from '../models/constant';
import { SmartPrompt } from '../util/smart';

/**
 * Interface for managing TradingView input operations
 */
export interface IInputManager {
  /**
   * Execute ReasonPrompt function which disables SwiftKeys, prompts for reasons,
   * and enables SwiftKeys after the prompt.
   * @param callback The callback function to be executed with the reason returned from SmartPrompt
   */
  reasonPrompt(callback: (reason: string) => void): void;

  /**
   * Copies the given text to the clipboard and displays a message.
   * @param text The text to be copied to the clipboard
   */
  clipboardCopy(text: string): void;

  /**
   * Sets focus on the input element with the specified ID.
   */
  focusCommandInput(): void;

  /**
   * Gets current swift key state
   * @returns True if swift keys are enabled
   */
  isSwiftEnabled(): boolean;

  /**
   * Title Change to Bridge with AHK
   */
  enableSwiftKey(): void;
}

/**
 * Manages TradingView input operations
 */
export class InputManager implements IInputManager {
  constructor(private readonly smartPrompt: SmartPrompt) {}

  /** @inheritdoc */
  reasonPrompt(callback: (reason: string) => void): void {
    //Disable SwiftKeys
    this.toggleSwiftKeys(false);

    //Prompt
    void this.smartPrompt
      .showModal(Constants.TRADING.PROMPT.REASONS, Constants.TRADING.PROMPT.OVERRIDES)
      .then((reason) => {
        callback(reason);
        //Enable SwiftKeys
        this.toggleSwiftKeys(true);
      })
      .catch((error) => {
        console.error('Error in reasonPrompt:', error);
        this.toggleSwiftKeys(true);
      });
  }

  /** @inheritdoc */
  clipboardCopy(text: string): void {
    void GM.setClipboard(text);
    this.message(`ClipCopy: ${text}`, 'yellow');
  }

  /** @inheritdoc */
  focusCommandInput(): void {
    $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).focus();
  }

  /** @inheritdoc */
  isSwiftEnabled(): boolean {
    return $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked');
  }

  /** @inheritdoc */
  enableSwiftKey(): void {
    const liner = ' - SwiftKeys';
    const swiftEnabled = this.isSwiftEnabled();

    if (swiftEnabled && !document.title.includes('SwiftKeys')) {
      document.title = document.title + liner;
    } else if (!swiftEnabled && document.title.includes('SwiftKeys')) {
      document.title = document.title.replace(liner, '');
    }
  }

  /**
   * Private helper to toggle swift keys
   * @param enabled Enable/disable swift keys
   */
  private toggleSwiftKeys(enabled: boolean): void {
    $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked', enabled);
    this.enableSwiftKey();
  }

  /**
   * Private helper to display messages
   * @param text Message text
   * @param color Message color
   */
  private message(text: string, color: string): void {
    $(`#${Constants.UI.IDS.INPUTS.DISPLAY}`).css('color', color).val(text);
  }
}
