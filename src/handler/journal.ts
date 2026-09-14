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
import { ICategoryManager } from '../manager/category';
import { ITimeFrameManager } from '../manager/timeframe';
import { JournalOpenEvent } from '../models/events';
import { CreateJournalNoteRequest, JournalResultStatus, JournalTopTimeframe } from '../models/journal';
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
   * Publishes the ticker for an opened journal.
   * @param ticker Primary ticker from the opened journal
   */
  handleJournalOpened(ticker: string): void;

  /**
   * Registers the localhost journal-opened handler.
   */
  registerJournalOpenedHandler(): void;

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
    timeframe: JournalTopTimeframe,
    type: JournalActionType
  ): Promise<void> {
    const screenshots = await this.takeJournalScreenshots(ticker, type, timeframe);
    const journal = await this.journalManager
      .createJournal({
        ticker,
        reason,
        screenshots,
        type: 'REJECTED',
        status: 'FAIL',
        topTimeframe: timeframe,
      })
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
    timeframe: JournalTopTimeframe
  ): Promise<void> {
    const journal = await this.journalManager
      .createJournal({
        ticker,
        reason,
        screenshots,
        type: 'TAKEN',
        status: 'SET',
        topTimeframe: timeframe,
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

    // Step 4: Use the stored journal top timeframe for result screenshots
    const screenshotTimeframe = runningJournal.top_timeframe;

    // Step 5: Take result screenshots
    const screenshots = await this.takeJournalScreenshots(ticker, JournalActionType.RESULT, screenshotTimeframe);

    // Step 6: Add images, tags, and update status
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
  public handleJournalOpened(ticker: string): void {
    const normalizedTicker = ticker.trim();
    if (!normalizedTicker) {
      return;
    }

    void this.journalManager.publishJournalOpenedEvent(normalizedTicker);
  }

  /** @inheritdoc */
  public registerJournalOpenedHandler(): void {
    document.addEventListener(Constants.DOM_EVENTS.JOURNAL_OPENED, (event) => {
      const ticker = (event as CustomEvent<string>).detail;
      if (typeof ticker === 'string') {
        this.handleJournalOpened(ticker);
      }
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

  /**
   * Shows reason selection modal with Swift keys disabled.
   * Disables Swift keys while modal is open to prevent keyboard interference.
   * Re-enables them after modal closes.
   *
   * When {@link includeTopTimeframe} is true, also shows a Timeframe group
   * and returns both the reason and selected journal top timeframe. The
   * default top timeframe is derived from the active screenshot tuple: TMN
   * when the tuple includes DL, SMN otherwise. The timeframe is non-null
   * for this overload and null when the group is not shown.
   *
   * @param includeTopTimeframe - When true, shows the Timeframe group and returns a non-null top timeframe;
   *                              when false or omitted, returns `timeframe: null`.
   * @returns For `true`, `{ reason: string | null; timeframe: JournalTopTimeframe }`.
   *          For `false` or omitted, `{ reason: string | null; timeframe: null }`.
   * @private
   */
  private showReasonModal(
    includeTopTimeframe: true
  ): Promise<{ reason: string | null; timeframe: JournalTopTimeframe }>;
  private showReasonModal(includeTopTimeframe?: false): Promise<{ reason: string | null; timeframe: null }>;
  private async showReasonModal(
    includeTopTimeframe = false
  ): Promise<{ reason: string | null; timeframe: JournalTopTimeframe | null }> {
    try {
      await this.tvManager.setSwiftKeysState(false);
      const groups: SmartChoiceGroup[] = [
        {
          id: Constants.TRADING.PROMPT.OVERRIDE_GROUP_ID,
          label: 'Override',
          choices: Constants.TRADING.PROMPT.OVERRIDES,
        },
      ];

      let defaultTimeframe: JournalTopTimeframe = TickerTimeframe.SMN;
      if (includeTopTimeframe) {
        defaultTimeframe = await this.resolveDefaultTopTimeframe();
        groups.push({
          id: Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID,
          label: 'Timeframe',
          choices: Constants.TRADING.PROMPT.TOP_TIMEFRAME_CHOICES,
          defaultChoice: defaultTimeframe,
        });
      }

      // TODO: Build REASONS from journal tag frequency analysis instead of hardcoded list.
      const response = await this.smartPrompt.showModal(Constants.TRADING.PROMPT.REASONS, groups);
      if (response.type === SmartPromptResponseType.CANCEL) {
        return { reason: null, timeframe: includeTopTimeframe ? defaultTimeframe : null };
      }

      const override = response.answers[Constants.TRADING.PROMPT.OVERRIDE_GROUP_ID];
      const reason =
        response.type === SmartPromptResponseType.NONE
          ? ''
          : override
            ? `${response.primarySelection}-${override}`
            : response.primarySelection;
      if (includeTopTimeframe) {
        const selectedTimeframe =
          (response.answers[Constants.TRADING.PROMPT.TOP_TIMEFRAME_GROUP_ID] as JournalTopTimeframe) ??
          defaultTimeframe;
        return { reason, timeframe: selectedTimeframe };
      }
      return { reason, timeframe: null };
    } catch (error) {
      throw new Error(`Failed to show reason modal: ${error}`);
    } finally {
      await this.tvManager.setSwiftKeysState(true);
    }
  }

  /**
   * Resolves the default journal top timeframe from the active screenshot tuple:
   * TMN when the tuple includes DL, SMN otherwise.
   * @returns Default journal top timeframe for the reason prompt Timeframe group
   * @private
   */
  private async resolveDefaultTopTimeframe(): Promise<JournalTopTimeframe> {
    const sequence = await this.timeframeManager.getSequence();
    return sequence.includes(TickerTimeframe.DL) ? TickerTimeframe.TMN : TickerTimeframe.SMN;
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
