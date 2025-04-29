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
   */
  handleRecordJournal(type: JournalType): void;

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
  public handleRecordJournal(type: JournalType): void {
    const ticker = this.tickerManager.getTicker();

    // BUG: #A Disable Swift Keys while recording journal
    this.tvManager.setSwiftKeysState(false);

    void this.smartPrompt
      .showModal(Constants.TRADING.PROMPT.REASONS, Constants.TRADING.PROMPT.OVERRIDES)
      .then((reason) => {
        void this.journalManager.createEntry(ticker, type, reason);
      })
      .catch((error) => {
        throw new Error(`Failed to select journal tag: ${error}`);
      });
  }

  /** @inheritdoc */
  public async handleJournalReasonPrompt(): Promise<void> {
    try {
      const reason = await this.smartPrompt.showModal(
        Constants.TRADING.PROMPT.REASONS,
        Constants.TRADING.PROMPT.OVERRIDES
      );
      if (!reason || reason === 'Cancel') {
        return;
      }

      const text = this.journalManager.createReasonText(reason);
      this.tvManager.clipboardCopy(text);
      this.styleManager.selectToolbar(Constants.DOM.TOOLBARS.TEXT);
    } catch (error) {
      throw new Error(`Failed to handle reason prompt: ${error}`);
    }
  }
}
