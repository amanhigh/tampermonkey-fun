/**
 * Interface and implementations for journal handling operations
 */

import { IOsClient } from '../client/os';
import { IJournalManager } from '../manager/journal';
import { ISmartPrompt, SmartChoiceGroup, SmartPromptResponseType } from '../util/smart';
import { IUIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { JournalActionType } from '../models/journal';
import { DomManager } from '../manager/dom';
import { Notifier } from '../util/notify';
import { ITradingViewManager } from '../manager/tv';
import { IStyleManager } from '../manager/style';
import { IAlertManager } from '../manager/alert';
import { ICategoryManager } from '../manager/category';
import { ITimeFrameManager } from '../manager/timeframe';
import { AlertClickAction, JournalOpenEvent } from '../models/events';
import { CreateJournalNoteRequest, JournalResultStatus } from '../models/journal';
import { ScreenshotResponse } from '../models/os';
import { TickerTimeframe } from '../models/timeframe';

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
  handleRecordJournal(type: JournalActionType): Promise<void>;

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
    private readonly domManager: DomManager,
    private readonly osClient: IOsClient,
    private readonly journalManager: IJournalManager,
    private readonly smartPrompt: ISmartPrompt,
    private readonly uiUtil: IUIUtil,
    private readonly tvManager: ITradingViewManager,
    private readonly styleManager: IStyleManager,
    private readonly alertManager: IAlertManager,
    private readonly categoryManager: ICategoryManager,
    private readonly timeframeManager: ITimeFrameManager
  ) {}

  /** @inheritdoc */
  public handleJournalButton(): void {
    this.uiUtil.toggleUI(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
  }

  /** @inheritdoc */
  public async handleRecordJournal(type: JournalActionType): Promise<void> {
    if (type === JournalActionType.SET) {
      const ticker = this.domManager.getTicker();
      await this.handleSetupJournal(ticker, type);
      return;
    }

    if (type === JournalActionType.RESULT) {
      const ticker = this.domManager.getTicker();
      await this.handleResultJournal(ticker);
      return;
    }

    const { reason, timeframe } = await this.showReasonModal(true);

    if (reason === null) {
      return;
    }

    if (type === JournalActionType.REJECTED && reason === '') {
      Notifier.warn('Rejected entries require a reason. Please provide a reason or cancel.');
      return;
    }

    const ticker = this.domManager.getTicker();

    if (type === JournalActionType.REJECTED) {
      await this.handleRejectedJournal(ticker, reason, timeframe, type);
      return;
    }
  }

  private async handleRejectedJournal(
    ticker: string,
    reason: string,
    timeframe: TickerTimeframe,
    type: JournalActionType
  ): Promise<void> {
    const screenshots = await this.takeJournalScreenshots(ticker, type, timeframe);
    const journal = await this.journalManager
      .createJournal({ ticker, reason, screenshots, type: 'REJECTED', status: 'FAIL', timeframe })
      .catch((error) => {
        throw new Error(`Failed to record journal entry: ${error}`);
      });

    await this.publishJournalOpenEvent(journal.id);
  }

  private async handleSetupJournal(ticker: string, type: JournalActionType): Promise<void> {
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
      checklistScreenshot = await this.osClient.screenshotRegion(ticker, type);
    } catch (error) {
      // API returns 409 when user aborts the region selection
      if ((error as Error).message.includes('409')) {
        Notifier.warn('Checklist screenshot was cancelled, aborting journal creation.');
        return;
      }
      throw new Error(`Failed to capture checklist screenshot: ${(error as Error).message}`);
    }

    // Step 3: Show reason prompt with timeframe selection after checklist screenshot
    const { reason, timeframe } = await this.showReasonModal(true);

    if (reason === null) {
      return;
    }

    // Step 4: Take normal timeframe screenshots
    const timeframeScreenshots = await this.takeJournalScreenshots(ticker, type, timeframe);

    // Step 5: Create journal
    await this.createTakenJournal(ticker, reason, [checklistScreenshot, ...timeframeScreenshots], note, timeframe);
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
    type: JournalActionType,
    timeframe: TickerTimeframe
  ): Promise<Awaited<ReturnType<IJournalManager['screenshotTicker']>>> {
    return this.journalManager.screenshotTicker(ticker, type, timeframe).catch((error) => {
      throw new Error(`Failed to take screenshot journal entry: ${error}`);
    });
  }

  private async createTakenJournal(
    ticker: string,
    reason: string,
    screenshots: ScreenshotResponse[],
    note: string,
    sequence: JournalSequence
  ): Promise<void> {
    const journal = await this.journalManager
      .createJournal({
        ticker,
        reason,
        screenshots,
        type: 'TAKEN',
        status: 'SET',
        sequence,
        notes: this.createSetupNotes(note),
      })
      .catch((error) => {
        throw new Error(`Failed to record journal entry: ${error}`);
      });

    await this.categoryManager.publishCategoryChanged([ticker]);
    await this.publishJournalOpenEvent(journal.id);
  }

  private async handleResultJournal(ticker: string): Promise<void> {
    // Step 1: Find running journal
    let runningJournal = null;
    try {
      runningJournal = await this.journalManager.findRunningJournal(ticker);
    } catch (error) {
      Notifier.warn(`Failed to find running journal: ${(error as Error).message}`);
      return;
    }

    if (!runningJournal) {
      Notifier.warn(`No running journal found for ${ticker}. Result cannot be captured.`);
      return;
    }

    // Step 2: Ask for result status
    const status = await this.showResultStatusModal();

    if (status === null) {
      return;
    }

    // Step 3: Ask for reason
    const { reason } = await this.showReasonModal();

    if (reason === null) {
      return;
    }

    // Step 4: Take result screenshots
    const screenshots = await this.takeJournalScreenshots(ticker, JournalActionType.RESULT);

    // Step 5: Add images, tags, and update status
    await this.journalManager.addJournalImages(runningJournal.id, screenshots);

    if (reason) {
      await this.journalManager.addReasonTags(runningJournal.id, reason);
    }

    await this.journalManager.updateJournalStatus(runningJournal.id, status);
    await this.categoryManager.publishCategoryChanged([ticker]);
    await this.publishJournalOpenEvent(runningJournal.id);
  }

  private async publishJournalOpenEvent(journalId: string): Promise<void> {
    await this.journalManager.publishJournalOpenEvent(journalId).catch((error) => {
      throw new Error(`Failed to publish journal open event: ${error}`);
    });
  }

  /** @inheritdoc */
  public async handleJournalReasonPrompt(): Promise<void> {
    const { reason } = await this.showReasonModal();

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
          window.location.replace(`/journal/${journalOpenEvent.journalId}`);
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
   * Shows reason selection modal with Swift keys disabled.
   * Disables Swift keys while modal is open to prevent keyboard interference.
   * Re-enables them after modal closes.
   *
   * When {@link includeSequence} is true, also shows a Timeframe sequence group
   * and returns both the reason and selected sequence.
   *
   * @param includeSequence - When true, shows Timeframe group and returns `{ reason, sequence }`.
   *                          When false (default), returns `{ reason, sequence: null }`.
   * @returns `{ reason, sequence }` where `reason` is `null` if cancelled.
   *          `sequence` is `null` when `includeSequence` is false.
   * @private
   */
  private async showReasonModal(
    includeSequence = false
  ): Promise<{ reason: string | null; sequence: JournalSequence | null }> {
    try {
      await this.tvManager.setSwiftKeysState(false);
      const groups: SmartChoiceGroup[] = [
        {
          id: Constants.TRADING.PROMPT.OVERRIDE_GROUP_ID,
          label: 'Override',
          choices: Constants.TRADING.PROMPT.OVERRIDES,
        },
      ];

      let defaultSequence: JournalSequence = 'YR';
      if (includeSequence) {
        const sequence = await this.timeframeManager.getSequence();
        defaultSequence = sequence.includes(TickerTimeframe.DL) ? 'MWD' : 'YR';
        groups.push({
          id: Constants.TRADING.PROMPT.SEQUENCE_GROUP_ID,
          label: 'Timeframe',
          choices: Constants.TRADING.PROMPT.SEQUENCE_CHOICES,
          defaultChoice: defaultSequence,
        });
      }

      // TODO: Build REASONS from journal tag frequency analysis instead of hardcoded list.
      const response = await this.smartPrompt.showModal(Constants.TRADING.PROMPT.REASONS, groups);
      if (response.type === SmartPromptResponseType.CANCEL) {
        return { reason: null, sequence: includeSequence ? defaultSequence : null };
      }

      const override = response.answers[Constants.TRADING.PROMPT.OVERRIDE_GROUP_ID];
      const reason =
        response.type === SmartPromptResponseType.NONE
          ? ''
          : override
            ? `${response.primarySelection}-${override}`
            : response.primarySelection;
      if (includeSequence) {
        const selectedSequence =
          (response.answers[Constants.TRADING.PROMPT.SEQUENCE_GROUP_ID] as JournalSequence) ?? defaultSequence;
        return { reason, sequence: selectedSequence };
      }
      return { reason, sequence: null };
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

  private async showResultStatusModal(): Promise<JournalResultStatus | null> {
    try {
      await this.tvManager.setSwiftKeysState(false);

      const response = await this.smartPrompt.showModal(['SUCCESS', 'FAIL', 'MISSED']);

      if (response.type === SmartPromptResponseType.CANCEL) {
        return null;
      }

      if (response.type === SmartPromptResponseType.NONE) {
        return null;
      }

      return response.primarySelection as JournalResultStatus;
    } catch (error) {
      throw new Error(`Failed to show result status modal: ${error}`);
    } finally {
      await this.tvManager.setSwiftKeysState(true);
    }
  }
}
