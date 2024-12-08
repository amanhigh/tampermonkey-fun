/**
 * Interface and implementations for journal handling operations
 */

import { IJournalManager } from '../manager/journal';
import { ISmartPrompt } from '../util/smart';
import { IUIUtil } from '../util/ui';
import { Constants } from '../models/constant';
import { Notifier } from '../util/notify';
import { ITimeFrameManager } from '../manager/timeframe';
import { Trend } from '../models/trading';
import { TickerManager } from '../manager/ticker';

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
  handleRecordJournal(trend: Trend): void;
}

/**
 * Handles journal operations and user interactions
 */
export class JournalHandler implements IJournalHandler {
  constructor(
    private readonly tickerManager: TickerManager,
    private readonly journalManager: IJournalManager,
    private readonly timeframeManager: ITimeFrameManager,
    private readonly smartPrompt: ISmartPrompt,
    private readonly uiUtil: IUIUtil
  ) {}

  /** @inheritdoc */
  public handleJournalButton(): void {
    this.uiUtil.toggleUI(`#${Constants.UI.IDS.AREAS.JOURNAL}`);
  }

  /** @inheritdoc */
  public handleRecordJournal(trend: Trend): void {
    const ticker = this.tickerManager.getTicker();

    void this.smartPrompt
      .showModal(Constants.TRADING.PROMPT.REASONS, Constants.TRADING.PROMPT.OVERRIDES)
      .then((reason) => {
        if (!reason || reason === 'Cancel') {
          return;
        }

        const tag = this.journalManager.createEntry(ticker, trend, reason);
        Notifier.success(`Journal entry created: ${tag}`);
      })
      .catch((error) => {
        Notifier.error(`Failed to create journal entry: ${error}`);
      });
  }
}
