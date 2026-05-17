import { Notifier } from '../util/notify';
import { ITickerManager } from '../manager/ticker';
import { ISymbolManager } from '../manager/symbol';
import { IPairHandler } from './pair';

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
   * Processes command strings for ticker operations
   * @param command The command string to process
   */
  processCommand(action: string, value: string): Promise<void>;
}

/**
 * Handles ticker operations and related UI updates
 */
export class TickerHandler implements ITickerHandler {
  constructor(
    private readonly tickerManager: ITickerManager,
    private readonly symbolManager: ISymbolManager,
    private readonly pairHandler: IPairHandler
  ) {}

  /** @inheritdoc */
  public async openTicker(ticker: string): Promise<void> {
    const exchangeTicker = await this.symbolManager.tvToExchangeTicker(ticker);
    await this.tickerManager.openTicker(exchangeTicker);
    Notifier.success(`Opened ${exchangeTicker}`);
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
        await this.pairHandler.mapInvestingTicker(value);
        break;
      }
      default:
        throw new Error(`Unsupported command action: ${action}`);
    }
  }
}
