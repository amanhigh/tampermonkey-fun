import { Constants } from '../models/constant';
import { IWaitUtil } from '../util/wait';
import { ITickerManager } from './ticker';
import { IAlertTickerManager } from './alert_ticker';

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
   * @returns Promise resolving to mapped Investing ticker, rejects if no mapping
   */
  getInvestingTicker(): Promise<string>;

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

  /**
   * Gets all rendered tickers from both watchlist and screener panels.
   * Combines tickers from both panels without deduplication.
   * @returns Array of ticker symbols from watchlist and screener DOM
   */
  getRenderedTickers(): string[];
}

/**
 * Manages all ticker operations including retrieval, mapping, navigation and selection
 */
export class DomManager implements IDomManager {
  constructor(
    private readonly waitUtil: IWaitUtil,
    private readonly tickerManager: ITickerManager,
    private readonly alertTickerManager: IAlertTickerManager
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
    let exchangeTicker = ticker;
    try {
      const record = await this.tickerManager.getTicker(ticker);
      // FIXME: compare record.exchange with this.getCurrentExchange() and warn on mismatch
      exchangeTicker = record.qualifiedName;
    } catch {
      // Fall back to raw ticker
    }
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

  // ── Private DOM Query Helpers ──

  /**
   * Extract ticker text from jQuery elements by selector.
   * @private
   */
  private tickerTextArray(selector: string): string[] {
    return $(selector)
      .toArray()
      .map((s) => s.textContent || s.innerHTML);
  }

  /**
   * Gets watchlist tickers from DOM.
   * @param visible - When true, only returns visible tickers
   * @private
   */
  private getWatchlistTickers(visible = false): string[] {
    const selector = visible ? `${Constants.DOM.WATCHLIST.SYMBOL}:visible` : Constants.DOM.WATCHLIST.SYMBOL;
    return this.tickerTextArray(selector);
  }

  /**
   * Gets screener tickers from DOM.
   * @param visible - When true, only returns visible tickers
   * @private
   */
  private getScreenerTickers(visible = false): string[] {
    const selector = visible ? `${Constants.DOM.SCREENER.SYMBOL}:visible` : Constants.DOM.SCREENER.SYMBOL;
    return this.tickerTextArray(selector);
  }

  /**
   * Gets selected watchlist tickers.
   * @private
   */
  private getSelectedWatchlistTickers(): string[] {
    return this.tickerTextArray(`${Constants.DOM.WATCHLIST.SELECTED} ${Constants.DOM.WATCHLIST.SYMBOL}:visible`);
  }

  /**
   * Gets selected screener tickers.
   * @private
   */
  private getSelectedScreenerTickers(): string[] {
    return this.tickerTextArray(`${Constants.DOM.SCREENER.SELECTED} ${Constants.DOM.SCREENER.SYMBOL}:visible`);
  }

  /**
   * Check if screener widget is visible in DOM.
   * @private
   */
  private isScreenerVisible(): boolean {
    const $widget = $(Constants.DOM.SCREENER.MAIN);
    return $widget.length > 0 && $widget.is(':visible');
  }

  /**
   * Gets currently selected tickers based on active view.
   * @private
   */
  private getVisibleSelectedTickers(): string[] {
    return this.isScreenerVisible() ? this.getSelectedScreenerTickers() : this.getSelectedWatchlistTickers();
  }

  /**
   * Gets currently visible tickers based on active view.
   * @private
   */
  private getVisibleTickers(): string[] {
    return this.isScreenerVisible() ? this.getScreenerTickers(true) : this.getWatchlistTickers(true);
  }

  /** @inheritdoc */
  getRenderedTickers(): string[] {
    return [...this.getWatchlistTickers(), ...this.getScreenerTickers()];
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
