import { ITradingViewScreenerManager } from '../manager/screener';
import { Notifier } from '../util/notify';
import { ITickerManager } from '../manager/ticker';
import { IRecentManager } from '../manager/recent';
import { ISymbolManager } from '../manager/symbol';
import { AlertFeedManager } from '../manager/alertfeed';
import { Constants } from '../models/constant';

/**
 * Interface for managing ticker operations
 */
export interface ITickerHandler {
  /**
   * Handles recent ticker reset functionality
   */
  resetRecent(): void;

  /**
   * Opens specified ticker symbol
   * @param ticker Ticker symbol to open
   */
  openTicker(ticker: string): void;

  /**
   * Processes command strings for ticker operations
   * @param command The command string to process
   */
  processCommand(command: string): void;
}

/**
 * Handles ticker operations and related UI updates
 */
export class TickerHandler implements ITickerHandler {
  // eslint-disable-next-line max-params
  constructor(
    private readonly recentManager: IRecentManager,
    private readonly tickerManager: ITickerManager,
    private readonly symbolManager: ISymbolManager,
    private readonly screenerManager: ITradingViewScreenerManager,
    private readonly alertFeedManager: AlertFeedManager
  ) {}

  /** @inheritdoc */
  public openTicker(ticker: string): void {
    try {
      const exchangeTicker = this.symbolManager.tvToExchangeTicker(ticker);
      this.tickerManager.openTicker(exchangeTicker);
      Notifier.success(`Opened ${exchangeTicker}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Notifier.error(`Failed to open ticker: ${message}`);
    }
  }

  /** @inheritdoc */
  /** @inheritdoc */
  public resetRecent(): void {
    this.recentManager.clearRecent();
    this.screenerManager.paintScreener();
    // Special values to Paint all tickers during Reset
    void this.alertFeedManager.createAlertFeedEvent(Constants.MISC.RESET_FEED);
    Notifier.warn('Recent Reset');
  }

  processCommand(command: string): void {
    const [action, value] = command.split('=');

    switch (action.toUpperCase()) {
      case 'E': {
        const ticker = this.tickerManager.getTicker();
        this.symbolManager.createTvToExchangeTickerMapping(ticker, value);
        Notifier.success(`Mapped ${ticker} to Exchange ${value}`);
        break;
      }
      default:
        throw new Error(`Unsupported command action: ${action}`);
    }
  }
}
