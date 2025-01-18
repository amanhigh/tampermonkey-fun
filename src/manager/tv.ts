import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';
import { IWaitUtil } from '../util/wait';

// Price and validation related constants
const PRICE_REGEX = /[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;

// Error messages for LTP operations
const TV_ERRORS = Object.freeze({
  LTP_NOT_FOUND: 'LTP element not found',
  LTP_PARSE_FAILED: 'LTP Parse Failed',
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
   * Get current state of swift keys
   * @returns true if swift keys are enabled, false otherwise
   */
  isSwiftKeysEnabled(): boolean;

  /**
   * Set swift keys state
   * @param enabled true to enable swift keys, false to disable
   */
  setSwiftKeysState(enabled: boolean): void;
}

/**
 * Manages TradingView page interactions and DOM operations
 */
export class TradingViewManager implements ITradingViewManager {
  /**
   * @param waitUtil Manager for DOM operations
   */
  constructor(private readonly waitUtil: IWaitUtil) {}

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
  async getCursorPrice(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.waitUtil.waitJEE(Constants.DOM.POPUPS.AUTO_ALERT, (el) => {
        try {
          const text = el.text();
          const priceText = text.replace('Copy price', '').trim();
          const match = PRICE_REGEX.exec(priceText);
          if (!match) {
            reject(new Error(`Cursor Extraction Failed for '${text}'`));
            return;
          }
          const altPrice = parseFloat(match[0].replace(/,/g, ''));
          if (isNaN(altPrice) || altPrice === 0) {
            reject(new Error(`Invalid Cursor Price: ${altPrice} in ${match[0]}`));
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
    Notifier.yellow(`📋 ClipCopy: ${text}`);
  }

  /** @inheritdoc */
  toggleFlag(): void {
    this.waitUtil.waitJClick(Constants.DOM.HEADER.SYMBOL_FLAG);
  }

  /** @inheritdoc */
  closeTextBox(): void {
    this.waitUtil.waitJClick(Constants.DOM.POPUPS.CLOSE_TEXTBOX);
  }

  private static readonly SWIFT_KEYS_TITLE_SUFFIX = ' - SwiftKeys';

  /** @inheritdoc */
  isSwiftKeysEnabled(): boolean {
    return $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked');
  }

  /** @inheritdoc */
  setSwiftKeysState(enabled: boolean): void {
    this.updateSwiftKeysCheckbox(enabled);
    this.updateSwiftKeysTitle(enabled);
  }

  /**
   * Update checkbox state in DOM
   * @param enabled true to check, false to uncheck swift keys checkbox
   */
  private updateSwiftKeysCheckbox(enabled: boolean): void {
    $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked', enabled);
  }

  /**
   * Update document title based on swift keys state
   * @param enabled true to add suffix, false to remove suffix
   */
  private updateSwiftKeysTitle(enabled: boolean): void {
    if (enabled && !document.title.includes(TradingViewManager.SWIFT_KEYS_TITLE_SUFFIX)) {
      document.title += TradingViewManager.SWIFT_KEYS_TITLE_SUFFIX;
    } else if (!enabled && document.title.includes(TradingViewManager.SWIFT_KEYS_TITLE_SUFFIX)) {
      document.title = document.title.replace(TradingViewManager.SWIFT_KEYS_TITLE_SUFFIX, '');
    }
  }
}
