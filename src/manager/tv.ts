import { Constants } from '../models/constant';
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
   * @param callback Function to be called with the alert price
   */
  getCursorPrice(callback: (price: number) => void): void;

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
  getCursorPrice(callback: (price: number) => void): void {
    this.waitUtil.waitJEE(Constants.DOM.POPUPS.AUTO_ALERT, (el) => {
      const match = PRICE_REGEX.exec(el.text());
      const altPrice = parseFloat(match![0].replace(/,/g, ''));
      callback(altPrice);
    });
  }

  /** @inheritdoc */
  clipboardCopy(text: string): void {
    void GM.setClipboard(text);
    this.message(`ClipCopy: ${text}`, 'yellow');
  }

  /** @inheritdoc */
  toggleFlag(): void {
    this.waitUtil.waitJClick(Constants.DOM.FLAGS.SYMBOL);
  }

  /** @inheritdoc */
  closeTextBox(): void {
    this.waitUtil.waitJClick(Constants.DOM.POPUPS.CLOSE_TEXTBOX);
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
