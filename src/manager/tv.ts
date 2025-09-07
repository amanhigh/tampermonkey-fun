import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';
import { IWaitUtil } from '../util/wait';
import { IRepoCron } from '../repo/cron';

// Price and validation related constants
const PRICE_REGEX = /-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/;

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

  /**
   * Starts automatic saving of workspace at regular intervals
   */
  startAutoSave(): void;
}

/**
 * Manages TradingView page interactions and DOM operations
 */
export class TradingViewManager implements ITradingViewManager {
  private static readonly SAVE_INTERVAL = 30 * 1000;

  /**
   * @param waitUtil Manager for DOM operations
   * @param repoCron Repository for cron operations
   */
  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly repoCron: IRepoCron
  ) {}

  public startAutoSave(): void {
    setInterval(() => void this.autoSave(), TradingViewManager.SAVE_INTERVAL);
  }

  private async autoSave(): Promise<void> {
    this.clickSaveButton();
    await this.repoCron.saveAllRepositories();
    Notifier.success('Workspace saved');
  }

  private clickSaveButton(): void {
    const $save = $(Constants.DOM.HEADER.SAVE);
    if ($save.length) {
      $save.click();
    }
  }

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
  public parsePriceFromText(text: string): number {
    const priceText = text.replace('Copy price', '').trim();
    const match = PRICE_REGEX.exec(priceText);
    if (!match) {
      throw new Error(`Cursor Extraction Failed for '${text}'`);
    }
    const price = parseFloat(match[0].replace(/,/g, ''));
    if (isNaN(price) || price === 0) {
      throw new Error(`Invalid Cursor Price: ${price} in ${match[0]}`);
    }
    return price;
  }

  async getCursorPrice(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.waitUtil.waitJEE(Constants.DOM.POPUPS.AUTO_ALERT, (el) => {
        try {
          const price = this.parsePriceFromText(el.text());
          resolve(price);
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

  /** @inheritdoc */
  isSwiftKeysEnabled(): boolean {
    return $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked');
  }

  /** @inheritdoc */
  setSwiftKeysState(enabled: boolean): void {
    this.updateSwiftKeysCheckbox(enabled);
  }

  /**
   * Update checkbox state in DOM
   * @param enabled true to check, false to uncheck swift keys checkbox
   */
  private updateSwiftKeysCheckbox(enabled: boolean): void {
    $(`#${Constants.UI.IDS.CHECKBOXES.SWIFT}`).prop('checked', enabled);
  }
}
