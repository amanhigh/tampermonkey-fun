/**
 * Interface and implementations for journal handling operations
 */

import { IJournalManager } from '../manager/journal';
import { ISmartPrompt } from '../util/smart';
import { IUIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { JournalType } from '../models/trading';
import { TickerManager } from '../manager/ticker';
import { Notifier } from '../util/notify';
import { ITradingViewManager } from '../manager/tv';
import { IStyleManager } from '../manager/style';
import { IAlertManager } from '../manager/alert';
import { AlertClickAction } from '../models/events';

/**
 * Interface for managing journal entry operations at UI/Event level
 */
export interface IJournalHandler {
  /**
   * Handles click on Journal Button in UI
   * Toggles visibility of journal area in UI
   */
  handleJournalButton(): void;

  /**
   * Handles Journal Creation operation
   * Shows reason prompt modal and creates journal entry
   * @param type Journal entry type (REJECTED, RESULT, SET)
   */
  handleRecordJournal(type: JournalType): Promise<void>;

  /**
   * Handles journal reason prompt operation
   * Shows reason prompt modal and copies formatted text to clipboard
   */
  handleJournalReasonPrompt(): Promise<void>;

  /**
   * Handles opening a reviewed journal ticker in TradingView via alert click event.
   * @param event Optional click event used to infer the clicked review item
   */
  handleReviewJournal(event?: Event): void;

  /**
   * Registers localhost review handlers and action button.
   */
  registerJournalReviewHandler(): void;
}

/**
 * Handles journal operations and user interactions
 */
export class JournalHandler implements IJournalHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly tickerManager: TickerManager,
    private readonly journalManager: IJournalManager,
    private readonly smartPrompt: ISmartPrompt,
    private readonly uiUtil: IUIUtil,
    private readonly tvManager: ITradingViewManager,
    private readonly styleManager: IStyleManager,
    private readonly alertManager: IAlertManager
  ) {}

  /** @inheritdoc */
  public handleJournalButton(): void {
    this.uiUtil.toggleUI(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
  }

  /** @inheritdoc */
  public async handleRecordJournal(type: JournalType): Promise<void> {
    const reason = await this.showReasonModal();

    // Handle cancel - user explicitly cancelled
    if (reason === null) {
      return;
    }

    // REJECTED requires a reason, SET/RESULT can have empty reason
    if (type === JournalType.REJECTED && reason === '') {
      Notifier.warn('Rejected entries require a reason. Please provide a reason or cancel.');
      return;
    }

    const ticker = this.tickerManager.getTicker();

    if (type === JournalType.REJECTED) {
      const screenshots = await this.journalManager.screenshotTicker(ticker, type).catch((error) => {
        throw new Error(`Failed to take screenshot journal entry: ${error}`);
      });

      await this.journalManager.createJournal({ ticker, reason, screenshots }).catch((error) => {
        throw new Error(`Failed to record journal entry: ${error}`);
      });
      return;
    }

    return this.journalManager.createEntry(ticker, type, reason).catch((error) => {
      throw new Error(`Failed to record journal entry: ${error}`);
    });
  }

  /** @inheritdoc */
  public async handleJournalReasonPrompt(): Promise<void> {
    const reason = await this.showReasonModal();

    if (!reason) {
      return;
    }

    const text = this.journalManager.createReasonText(reason);
    this.tvManager.clipboardCopy(text);
    this.styleManager.selectToolbar(Constants.DOM.TOOLBARS.TEXT);
  }

  /** @inheritdoc */
  public handleReviewJournal(event?: Event): void {
    const ticker = this.extractReviewTicker(event);
    if (!ticker) {
      return;
    }

    void this.alertManager.createAlertClickEvent(ticker, AlertClickAction.OPEN);
  }

  /** @inheritdoc */
  public registerJournalReviewHandler(): void {
    document.querySelectorAll(Constants.DOM.JOURNAL.REVIEW_LINK).forEach((reviewLink) => {
      reviewLink.addEventListener('click', (event) => {
        void this.handleReviewJournal(event);
      });
    });
  }

  private extractReviewTicker(event?: Event): string | null {
    if (typeof Element !== 'undefined' && event?.target instanceof Element) {
      const reviewLink = event.target.closest('a[href^="/journal/"]');
      return (
        reviewLink?.querySelector(Constants.DOM.JOURNAL.REVIEW_TICKER)?.textContent?.trim() ??
        reviewLink?.querySelector('span.font-semibold')?.textContent?.trim() ??
        document.querySelector(Constants.DOM.JOURNAL.CURRENT_TICKER)?.textContent?.trim() ??
        null
      );
    }

    return document.querySelector(Constants.DOM.JOURNAL.CURRENT_TICKER)?.textContent?.trim() || null;
  }

  /**
   * Shows reason selection modal with Swift keys disabled
   * Disables Swift keys while modal is open to prevent keyboard interference
   * Re-enables them after modal closes
   * @private
   * @returns Selected reason or null if cancelled/no selection
   */
  private async showReasonModal(): Promise<string | null> {
    try {
      await this.tvManager.setSwiftKeysState(false);

      const response = await this.smartPrompt.showModal(
        Constants.TRADING.PROMPT.REASONS,
        Constants.TRADING.PROMPT.OVERRIDES
      );

      // Handle cancel - user explicitly cancelled
      if (response.type === 'cancel') {
        return null;
      }

      // Handle none - user chose no reason (valid for SET/RESULT, not for REJECTED)
      if (response.type === 'none') {
        return ''; // Empty string for no reason
      }

      // Handle reason - user provided a valid reason
      return response.value;
    } catch (error) {
      throw new Error(`Failed to show reason modal: ${error}`);
    } finally {
      await this.tvManager.setSwiftKeysState(true);
    }
  }
}
