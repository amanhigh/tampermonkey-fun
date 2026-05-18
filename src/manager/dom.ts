import { Constants } from '../models/constant';
import { IWaitUtil } from '../util/wait';
import { ITradingViewScreenerManager } from './screener';
import { ISymbolManager } from './symbol';
import { IAlertTickerManager } from './alert_ticker';
import { ITradingViewWatchlistManager } from './watchlist';

/**
 * Minimum number of tickers required for selection
 */
const MIN_SELECTED_TICKERS = 2;

/**
 * Interface for managing ticker operations
 */
export interface IDomManager {
  /**
   * Gets current ticker from DOM
   * @returns Current ticker symbol
   */
  getTicker(): string;

  /**
   * Gets current exchange from DOM
   * @returns Current exchange
   */
  getCurrentExchange(): string;

  /**
   * Maps current TradingView ticker to Investing ticker
   * @returns Mapped Investing ticker or original if no mapping exists
   */
  getInvestingTicker(): string;

  /**
   * Opens specified ticker in TradingView.
   * Qualifies ticker with exchange prefix from backend before navigating.
   * @param ticker - Ticker to open
   */
  openTicker(ticker: string): Promise<void>;

  /**
   * Gets currently selected tickers from watchlist and screener
   * @returns Selected tickers
   */
  getSelectedTickers(): string[];

  /**
   * Opens current ticker relative to its benchmark
   */
  openBenchmarkTicker(): Promise<void>;

  /**
   * Navigates through visible tickers in either screener or watchlist
   * @param step - Number of steps to move (positive for forward, negative for backward)
   * @throws Error When no visible tickers are available
   */
  navigateTickers(step: number): Promise<void>;
}

/**
 * Manages all ticker operations including retrieval, mapping, navigation and selection
 */
export class DomManager implements IDomManager {
  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly symbolManager: ISymbolManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly screenerManager: ITradingViewScreenerManager,
    private readonly watchlistManager: ITradingViewWatchlistManager
  ) {}

  /** @inheritdoc */
  getTicker(): string {
    const ticker = $(Constants.DOM.BASIC.TICKER).text();
    if (!ticker) {
      throw new Error('Ticker not found');
    }
    return ticker;
  }

  /** @inheritdoc */
  getCurrentExchange(): string {
    const exchange = $(Constants.DOM.BASIC.EXCHANGE).text();
    if (!exchange) {
      throw new Error('Exchange not found');
    }
    return exchange;
  }

  /** @inheritdoc */
  async getInvestingTicker(): Promise<string> {
    // HACK: Remove out of this as its not pure DOM
    const tvTicker = this.getTicker();
    const alertTicker = await this.alertTickerManager.getAlertTicker(tvTicker);
    if (!alertTicker) {
      throw new Error(`Investing ticker not found for ${tvTicker}`);
    }
    return alertTicker.symbol;
  }

  /** @inheritdoc */
  async openTicker(ticker: string): Promise<void> {
    const exchangeTicker = await this.symbolManager.tvToExchangeTicker(ticker);
    this.waitUtil.waitClick(Constants.DOM.BASIC.TICKER);
    this.waitUtil.waitInput(Constants.DOM.POPUPS.SEARCH, exchangeTicker);
  }

  /** @inheritdoc */
  getSelectedTickers(): string[] {
    let selected = this.getVisibleSelectedTickers();
    if (selected.length < MIN_SELECTED_TICKERS) {
      selected = [this.getTicker()];
    }
    return selected;
  }

  /** @inheritdoc */
  async openBenchmarkTicker(): Promise<void> {
    const ticker = this.getTicker();
    const exchange = this.getCurrentExchange();

    let benchmark: string;
    switch (exchange) {
      case 'MCX':
        benchmark = 'MCX:GOLD1!';
        break;
      case Constants.EXCHANGE.TYPES.NSE:
        benchmark = 'NIFTY';
        break;
      case 'BINANCE':
        benchmark = 'BINANCE:BTCUSDT';
        break;
      default:
        benchmark = 'XAUUSD';
    }

    await this.openTicker(`${ticker}/${benchmark}`);
  }

  /** @inheritdoc */
  async navigateTickers(step: number): Promise<void> {
    const currentTicker = this.getTicker();
    const visibleTickers = this.getVisibleTickers();

    if (!visibleTickers.length) {
      throw new Error('No visible tickers available for navigation');
    }

    const nextTicker = this.calculateNextTicker(currentTicker, visibleTickers, step);

    await this.openTicker(nextTicker);
  }

  /**
   * Gets currently visible tickers based on active view
   * @private
   * @returns Array of visible ticker symbols
   */
  private getVisibleSelectedTickers(): string[] {
    return this.screenerManager.isScreenerVisible()
      ? this.screenerManager.getSelectedTickers()
      : this.watchlistManager.getSelectedTickers();
  }

  /**
   * Gets currently visible tickers based on active view
   * @private
   * @returns Array of visible ticker symbols
   */
  private getVisibleTickers(): string[] {
    return this.screenerManager.isScreenerVisible()
      ? this.screenerManager.getTickers(true)
      : this.watchlistManager.getTickers(true);
  }

  /**
   * Calculates the next ticker based on current position and step
   * @private
   * @param currentTicker - Currently selected ticker
   * @param tickers - Array of available tickers
   * @param step - Number of steps to move
   * @returns Next ticker symbol
   */
  private calculateNextTicker(currentTicker: string, tickers: string[], step: number): string {
    const currentIndex = tickers.indexOf(currentTicker);
    let nextIndex = currentIndex + step;

    // Handle wraparound
    if (nextIndex < 0) {
      nextIndex = tickers.length - 1;
    } else if (nextIndex >= tickers.length) {
      nextIndex = 0;
    }

    return tickers[nextIndex];
  }
}
