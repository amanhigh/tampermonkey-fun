/**
 * Interface and implementations for journal handling operations
 */

import { IJournalManager } from '../manager/journal';
import { ISmartPrompt } from '../util/smart';
import { IUIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { JournalType } from '../models/trading';
import { TickerManager } from '../manager/ticker';
import { ITradingViewManager } from '../manager/tv';
import { IStyleManager } from '../manager/style';

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
}

/**
 * Handles journal operations and user interactions
 */
export class JournalHandler implements IJournalHandler {
  constructor(
    private readonly tickerManager: TickerManager,
    private readonly journalManager: IJournalManager,
    private readonly smartPrompt: ISmartPrompt,
    private readonly uiUtil: IUIUtil,
    private readonly tvManager: ITradingViewManager,
    private readonly styleManager: IStyleManager
  ) {}

  /** @inheritdoc */
  public handleJournalButton(): void {
    this.uiUtil.toggleUI(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
  }

  /** @inheritdoc */
  public async handleRecordJournal(type: JournalType): Promise<void> {
    const reason = await this.showReasonModal();

    if (!reason) {
      return;
    }

    const ticker = this.tickerManager.getTicker();
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

      const reason = await this.smartPrompt.showModal(
        Constants.TRADING.PROMPT.REASONS,
        Constants.TRADING.PROMPT.OVERRIDES
      );

      if (!reason || reason === 'Cancel') {
        return null;
      }

      return reason;
    } catch (error) {
      throw new Error(`Failed to show reason modal: ${error}`);
    } finally {
      await this.tvManager.setSwiftKeysState(true);
    }
  }
}
