import { Notifier } from '../util/notify';
import { ITickerManager } from '../manager/ticker';
import { ISymbolManager } from '../manager/symbol';
import { IPairHandler } from './pair';

/**
 * Interface for managing ticker operations
 */
export interface ITickerHandler {
  /**
   * Opens specified ticker symbol
   * @param ticker Ticker symbol to open
   */
  openTicker(ticker: string): void;

  /**
   * Processes command strings for ticker operations
   * @param command The command string to process
   */
  processCommand(action: string, value: string): void;
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
  public openTicker(ticker: string): void {
    const exchangeTicker = this.symbolManager.tvToExchangeTicker(ticker);
    this.tickerManager.openTicker(exchangeTicker);
    Notifier.success(`Opened ${exchangeTicker}`);
  }

  processCommand(action: string, value: string): void {
    switch (action.toUpperCase()) {
      case 'E': {
        const ticker = this.tickerManager.getTicker();
        this.symbolManager.createTvToExchangeTickerMapping(ticker, value);
        Notifier.success(`Mapped ${ticker} to Exchange ${value}`);
        break;
      }
      case 'P': {
        void this.pairHandler.mapInvestingTicker(value);
        break;
      }
      default:
        throw new Error(`Unsupported command action: ${action}`);
    }
  }
}
