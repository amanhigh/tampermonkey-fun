import { Constants } from '../models/constant';
import { IWaitUtil } from '../util/wait';
import { IPaintManager } from '../manager/paint';
import { ITradingViewScreenerManager } from '../manager/screener';
import { ITradingViewWatchlistManager } from '../manager/watchlist';
import { IKiteHandler } from './kite';
import { Notifier } from '../util/notify';
import { ITickerManager } from '../manager/ticker';
import { IRecentManager } from '../manager/recent';
import { SyncUtil } from '../util/sync';
import { ISequenceHandler } from './sequence';
import { ISymbolManager } from '../manager/symbol';

/**
 * Interface for managing ticker operations and command processing
 */
export interface ITickerHandler {
  /**
   * Handles ticker change operations and updates UI
   */
  onTickerChange(): void;

  /**
   * Handles recent ticker reset functionality
   */
  onRencentReset(): void;

  /**
   * Processes command input
   * Handles commands in format ACTION=VALUE
   * Available commands:
   * - E=NSE (Maps current ticker to exchange, auto-picks if no value)
   * @param input Command string to process
   */
  processCommand(input: string): Promise<void>;

  /**
   * Handles command submission on enter key press
   * @param e Keyboard event to process
   */
  handleCommandSubmit(e: KeyboardEvent): void;
}

interface CommandParts {
  action: string;
  value: string;
}

/**
 * Handles ticker operations and related UI updates
 */
export class TickerHandler implements ITickerHandler {
  private readonly ENTER_KEY_CODE = 13;
  private readonly HELP_MESSAGE = `
Command Format: ACTION=VALUE
Available Commands:
- E=NSE (Maps current ticker to exchange, auto-picks if no value)
`;

  constructor(
    private readonly recentManager: IRecentManager,
    private readonly tickerManager: ITickerManager,
    private readonly symbolManager: ISymbolManager,
    private readonly waitUtil: IWaitUtil,
    private readonly paintManager: IPaintManager,
    private readonly screenerManager: ITradingViewScreenerManager,
    private readonly sequenceHandler: ISequenceHandler,
    private readonly watchlistManager: ITradingViewWatchlistManager,
    private readonly kiteHandler: IKiteHandler,
    private readonly syncUtil: SyncUtil
  ) {}

  /** @inheritdoc */
  public async processCommand(input: string): Promise<void> {
    const parts = this.parseCommand(input);
    if (!parts.action || !parts.value) {
      this.displayHelpMessage();
      return;
    }

    try {
      switch (parts.action) {
        case 'E':
          await this.handleExchangeCommand(parts.value);
          break;
        default:
          this.displayHelpMessage();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(message);
    }
  }

  /** @inheritdoc */
  public handleCommandSubmit(e: KeyboardEvent): void {
    if (!this.isEnterKey(e)) {
      return;
    }

    const input = $(`#${Constants.UI.IDS.INPUTS.COMMAND}`).val();
    if (typeof input === 'string') {
      void this.processCommand(input);
    }
  }

  /** @inheritdoc */
  public onTickerChange(): void {
    //HACK: Make Event Based when New Ticker Appears
    // FIXME: Change with Sync Util which has this func.
    this.syncUtil.waitOn('tickerChange', 150, () => {
      // TODO: AlertRefreshLocal - Not yet migrated to typescript
      this.alertRefreshLocal();

      // Update UI components
      this.paintManager.paintHeader();
      this.recordRecentTicker();
      this.sequenceHandler.displaySequence();

      // Handle GTT operations
      // FIXME: Pass GttOrderMap from Kite Manager
      this.kiteHandler.gttSummary();
    });
  }

  /** @inheritdoc */
  public onRencentReset(): void {
    const recentEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.RECENT}`).prop('checked');

    if (recentEnabled) {
      Notifier.success('Recent Enabled');
    } else {
      this.recentManager.clearRecent();
      this.screenerManager.paintScreener();
      this.watchlistManager.paintAlertFeedEvent().catch(() => {
        Notifier.error('Error updating watchlist');
      });
      Notifier.error('Recent Disabled');
    }
  }

  private async handleExchangeCommand(value: string): Promise<void> {
    const ticker = this.tickerManager.getTicker();
    const exchange = value || this.tickerManager.getCurrentExchange();

    await this.symbolManager.createTvToExchangeTickerMapping(ticker, exchange);
    Notifier.success(`Mapped ${ticker} to ${exchange}`);
  }

  private parseCommand(input: string): CommandParts {
    const [action, value] = input.split('=');
    return {
      action: action?.trim() ?? '',
      value: value?.trim() ?? '',
    };
  }

  private displayHelpMessage(): void {
    Notifier.info(this.HELP_MESSAGE);
  }

  private isEnterKey(e: KeyboardEvent): boolean {
    return e.keyCode === this.ENTER_KEY_CODE;
  }

  private recordRecentTicker(): void {
    const recentEnabled = $(`#${Constants.UI.IDS.CHECKBOXES.RECENT}`).prop('checked');
    const ticker = this.tickerManager.getTicker();

    if (recentEnabled && !this.recentManager.isRecent(ticker)) {
      this.recentManager.addTicker(ticker);
      this.screenerManager.paintScreener();
      this.watchlistManager.paintAlertFeedEvent().catch(() => {
        Notifier.error('Error updating watchlist');
      });
    }
  }
}
