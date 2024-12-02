import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';
import { SmartPrompt } from '../util/smart';
import { IWaitUtil } from '../util/wait';

// Price and validation related constants
const PRICE_REGEX = /[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;

// Error messages for LTP operations
const TV_ERRORS = Object.freeze({
  LTP_NOT_FOUND: 'LTP element not found',
  LTP_PARSE_FAILED: 'Failed to parse LTP:',
} as const);

/**
 * Interface for managing TradingView page interactions and DOM operations
 */
export interface ITradingViewManager {
  /**
   * Retrieves the name from the DOM
   * @returns The name retrieved from the DOM
   */
  getName(): string;

  /**
   * Retrieves the last traded price
   * @returns The last traded price as a float, or null if parsing fails
   */
  getLastTradedPrice(): number;

  /**
   * Wait for Add Alert Context Menu Option to Capture Price
   * @returns Promise resolving to the alert price
   */
  getCursorPrice(): Promise<number>;

  /**
   * Copies the given text to the clipboard and displays a message.
   * @param text The text to be copied to the clipboard
   */
  clipboardCopy(text: string): void;

  /**
   * Toggles the flag and updates watchlist
   */
  toggleFlag(): void;

  /**
   * Closes the text box dialog
   */
  closeTextBox(): void;

  /**
   * Gets current swift key state
   * @returns True if swift keys are enabled
   */
  isSwiftEnabled(): boolean;

  /**
   * Title Change to Bridge with AHK
   */
  toggleSwiftKeys(enabled: boolean): void;

  /**
   * Execute ReasonPrompt function which disables SwiftKeys, prompts for reasons,
   * and enables SwiftKeys after the prompt.
   * @param callback The callback function to be executed with the reason returned from SmartPrompt
   */
  reasonPrompt(callback: (reason: string) => void): void;
}

/**
 * Manages TradingView page interactions and DOM operations
 */
export class TradingViewManager implements ITradingViewManager {
  /**
   * @param waitUtil Manager for DOM operations
   */
  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly smartPrompt: SmartPrompt
  ) {}

  /** @inheritdoc */
  getName(): string {
    return $(Constants.DOM.BASIC.NAME)[0].innerHTML;
  }

  /** @inheritdoc */
  getLastTradedPrice(): number {
    const ltpElement = $(Constants.DOM.BASIC.LTP);
    if (ltpElement.length === 0) {
      throw new Error(TV_ERRORS.LTP_NOT_FOUND);
    }

    const ltpText = ltpElement.text();
    const cleanedText = ltpText.replace(/,|\s/g, '');
    const price = parseFloat(cleanedText);

    if (isNaN(price)) {
      throw new Error(TV_ERRORS.LTP_PARSE_FAILED);
    }

    return price;
  }

  /** @inheritdoc */
  getCursorPrice(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.waitUtil.waitJEE(Constants.DOM.POPUPS.AUTO_ALERT, (el) => {
        try {
          const match = PRICE_REGEX.exec(el.text());
          if (!match) {
            reject(new Error('Failed to extract price from cursor position'));
            return;
          }
          const altPrice = parseFloat(match[0].replace(/,/g, ''));
          if (isNaN(altPrice)) {
            reject(new Error('Invalid price format at cursor position'));
            return;
          }
          resolve(altPrice);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /** @inheritdoc */
  clipboardCopy(text: string): void {
    void GM.setClipboard(text);
    Notifier.message(`ClipCopy: ${text}`, 'yellow');
  }

  /** @inheritdoc */
  toggleFlag(): void {
    this.waitUtil.waitJClick(Constants.DOM.FLAGS.SYMBOL);
  }

  /** @inheritdoc */
  closeTextBox(): void {
    this.waitUtil.waitJClick(Constants.DOM.POPUPS.CLOSE_TEXTBOX);
  }

  /** @inheritdoc */
  isSwiftEnabled(): boolean {
    return $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked');
  }

  /** @inheritdoc */
  private enableSwiftKey(): void {
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
  toggleSwiftKeys(enabled: boolean): void {
    $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked', enabled);
    this.enableSwiftKey();
  }

  // FIXME: Move to Handler Later ?
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
}
