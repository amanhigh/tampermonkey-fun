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
import { AlertClickAction, JournalOpenEvent } from '../models/events';
import { CreateJournalNoteRequest, ScreenshotResponse } from '../models/kohan';

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

  /**
   * Registers localhost journal-open listener.
   */
  registerOpenJournalHandler(): void;
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
    // SET flow: reason prompt is handled inside handleSetupJournal after checklist screenshot
    if (type === JournalType.SET) {
      const ticker = this.tickerManager.getTicker();
      await this.handleSetupJournal(ticker, type);
      return;
    }

    const reason = await this.showReasonModal();

    if (reason === null) {
      return;
    }

    if (type === JournalType.REJECTED && reason === '') {
      Notifier.warn('Rejected entries require a reason. Please provide a reason or cancel.');
      return;
    }

    const ticker = this.tickerManager.getTicker();

    if (type === JournalType.REJECTED) {
      await this.handleRejectedJournal(ticker, reason, type);
      return;
    }

    return this.journalManager.createEntry(ticker, type, reason).catch((error) => {
      throw new Error(`Failed to record journal entry: ${error}`);
    });
  }

  private async handleRejectedJournal(ticker: string, reason: string, type: JournalType): Promise<void> {
    const screenshots = await this.takeJournalScreenshots(ticker, type);
    const journal = await this.journalManager
      .createJournal({ ticker, reason, screenshots, type: 'REJECTED', status: 'FAIL' })
      .catch((error) => {
        throw new Error(`Failed to record journal entry: ${error}`);
      });

    await this.publishJournalOpenEvent(journal.id);
  }

  private async handleSetupJournal(ticker: string, type: JournalType): Promise<void> {
    // Step 1: Collect mandatory setup note
    const note = await this.showSetupNoteModal();

    if (note === null) {
      return;
    }

    if (note.trim() === '') {
      Notifier.warn('Setup entries require a note. Please provide a note or cancel.');
      return;
    }

    // Step 2: Capture checklist region screenshot
    let checklistScreenshot = null;
    try {
      checklistScreenshot = await this.journalManager.screenshotChecklist(ticker, type);
    } catch (error) {
      // API returns 409 when user aborts the region selection
      if ((error as Error).message.includes('409')) {
        Notifier.warn('Checklist screenshot was cancelled, aborting journal creation.');
        return;
      }
      throw new Error(`Failed to capture checklist screenshot: ${(error as Error).message}`);
    }

    // Step 3: Show reason prompt after checklist screenshot
    const reason = await this.showReasonModal();

    if (reason === null) {
      return;
    }

    // Step 4: Take normal timeframe screenshots
    const timeframeScreenshots = await this.takeJournalScreenshots(ticker, type);

    // Step 5: Create journal
    await this.createTakenJournal(ticker, reason, [checklistScreenshot, ...timeframeScreenshots], note);
  }

  private createSetupNotes(note: string): CreateJournalNoteRequest[] {
    return [
      {
        status: 'SET',
        content: note,
        format: 'MARKDOWN',
      },
    ];
  }

  private async takeJournalScreenshots(
    ticker: string,
    type: JournalType
  ): Promise<Awaited<ReturnType<IJournalManager['screenshotTicker']>>> {
    return this.journalManager.screenshotTicker(ticker, type).catch((error) => {
      throw new Error(`Failed to take screenshot journal entry: ${error}`);
    });
  }

  private async createTakenJournal(
    ticker: string,
    reason: string,
    screenshots: ScreenshotResponse[],
    note: string
  ): Promise<void> {
    const journal = await this.journalManager
      .createJournal({
        ticker,
        reason,
        screenshots,
        type: 'TAKEN',
        status: 'SET',
        notes: this.createSetupNotes(note),
      })
      .catch((error) => {
        throw new Error(`Failed to record journal entry: ${error}`);
      });

    await this.publishJournalOpenEvent(journal.id);
  }

  private async publishJournalOpenEvent(journalId: string): Promise<void> {
    await this.journalManager.publishJournalOpenEvent(journalId).catch((error) => {
      throw new Error(`Failed to publish journal open event: ${error}`);
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

  /** @inheritdoc */
  public registerOpenJournalHandler(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.JOURNAL_OPEN,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        if (newValue && typeof newValue === 'string') {
          const journalOpenEvent = JournalOpenEvent.fromString(newValue);
          window.location.assign(`/journal/${journalOpenEvent.journalId}`);
        }
      }
    );
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

  private async showSetupNoteModal(): Promise<string | null> {
    try {
      await this.tvManager.setSwiftKeysState(false);

      return await this.smartPrompt.showTextareaModal(
        'Trade Setup Note',
        Constants.TRADING.PROMPT.TRADE_INFO,
        'Save Note'
      );
    } catch (error) {
      throw new Error(`Failed to show setup note modal: ${error}`);
    } finally {
      await this.tvManager.setSwiftKeysState(true);
    }
  }
}
