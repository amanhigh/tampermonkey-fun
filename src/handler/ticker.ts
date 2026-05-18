import { Notifier } from '../util/notify';
import { IDomManager } from '../manager/dom';
import { ISymbolManager } from '../manager/symbol';
import { IStyleManager } from '../manager/style';
import { ITickerClient } from '../client/ticker';
import { IAlertTickerHandler } from './alert_ticker';

/**
 * Interface for managing ticker operations
 */
export interface ITickerHandler {
  /**
   * Opens specified ticker symbol in TradingView.
   * Exchange-qualifies the ticker via backend before navigating.
   * @param ticker Ticker symbol to open
   */
  openTicker(ticker: string): Promise<void>;

  /**
   * Stops tracking a TV ticker — deletes the primary ticker (MySQL cascade removes alert tickers)
   * and cleans up local mappings.
   * @param tvTicker The TradingView ticker to stop tracking
   */
  stopTracking(tvTicker: string): Promise<void>;

  /**
   * Processes command strings for ticker operations
   * @param action The command action
   * @param value The command value
   */
  processCommand(action: string, value: string): Promise<void>;
}

/**
 * Handles ticker operations and related UI updates
 */
export class TickerHandler implements ITickerHandler {
  constructor(
    private readonly tickerManager: IDomManager,
    private readonly symbolManager: ISymbolManager,
    private readonly styleManager: IStyleManager,
    private readonly tickerClient: ITickerClient,
    private readonly alertTickerHandler: IAlertTickerHandler
  ) {}

  /** @inheritdoc */
  public async openTicker(ticker: string): Promise<void> {
    const exchangeTicker = await this.symbolManager.tvToExchangeTicker(ticker);
    await this.tickerManager.openTicker(exchangeTicker);
    Notifier.success(`Opened ${exchangeTicker}`);
  }

  /** @inheritdoc */
  public async stopTracking(tvTicker: string): Promise<void> {
    if (this.tickerManager.getTicker() === tvTicker) {
      this.styleManager.clearAll();
    }

    try {
      await this.tickerClient.deleteTicker(tvTicker);
    } catch (error) {
      Notifier.warn(`Failed to delete ticker ${tvTicker}: ${(error as Error).message}`);
    }

    this.symbolManager.deleteTvTicker(tvTicker);

    Notifier.success(`⏹ Stopped tracking ${tvTicker}`);
  }

  /** @inheritdoc */
  async processCommand(action: string, value: string): Promise<void> {
    switch (action.toUpperCase()) {
      case 'E': {
        const ticker = this.tickerManager.getTicker();
        await this.symbolManager.setExchange(ticker, value);
        Notifier.success(`Mapped ${ticker} to Exchange ${value}`);
        break;
      }
      case 'P': {
        await this.alertTickerHandler.linkInvestingTicker(value);
        break;
      }
      default:
        throw new Error(`Unsupported command action: ${action}`);
    }
  }
}
