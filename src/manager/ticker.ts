import { Constants } from '../models/constant';
import { IRecentTickerRepo } from '../repo/recent';
import { IWaitUtil } from '../util/wait';
import { ITradingViewScreenerManager } from './screener';
import { ISymbolManager } from './symbol';
import { ITradingViewWatchlistManager } from './watchlist';

/**
 * Minimum number of tickers required for selection
 */
const MIN_SELECTED_TICKERS = 2;

/**
 * Interface for managing ticker operations
 */
export interface ITickerManager {
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
   * Opens specified ticker in TradingView
   * @param ticker - Ticker to open
   */
  openTicker(ticker: string): void;

  /**
   * Gets currently selected tickers from watchlist and screener
   * @returns Selected tickers
   */
  getSelectedTickers(): string[];

  /**
   * Opens current ticker relative to its benchmark
   */
  openBenchmarkTicker(): void;

  /**
   * Check if there are any recent tickers
   * @returns True if recent tickers exist
   */
  hasRecentTickers(): boolean;

  /**
   * Navigates through visible tickers in either screener or watchlist
   * @param step - Number of steps to move (positive for forward, negative for backward)
   * @throws Error When no visible tickers are available
   */
  navigateTickers(step: number): void;
}

/**
 * Manages all ticker operations including retrieval, mapping, navigation and selection
 */
export class TickerManager implements ITickerManager {
  /**
   * Manages all ticker operations including retrieval, mapping, navigation and selection
   * @param recentTickerRepo Repository for recent tickers
   * @param waitUtil DOM operation manager
   * @param symbolManager Manager for symbol operations
   * @param screenerManager Manager for screener operations
   * @param watchlistManager Manager for watchlist operations
   */
  constructor(
    private readonly _recentTickerRepo: IRecentTickerRepo,
    private readonly _waitUtil: IWaitUtil,
    private readonly _symbolManager: ISymbolManager,
    private readonly _screenerManager: ITradingViewScreenerManager,
    private readonly _watchlistManager: ITradingViewWatchlistManager
  ) {}

  /** @inheritdoc */
  getTicker(): string {
    return $(Constants.DOM.BASIC.TICKER).html() || '';
  }

  /** @inheritdoc */
  getCurrentExchange(): string {
    return $(Constants.DOM.BASIC.EXCHANGE).text() || '';
  }

  /** @inheritdoc */
  getInvestingTicker(): string {
    const tvTicker = this.getTicker();
    const investingTicker = this._symbolManager.tvToInvesting(tvTicker);
    return investingTicker || tvTicker;
  }

  /** @inheritdoc */
  openTicker(ticker: string): void {
    const exchangeTicker = this._symbolManager.tvToExchangeTicker(ticker);
    this._waitUtil.waitClick(Constants.DOM.BASIC.TICKER);
    this._waitUtil.waitInput(Constants.DOM.POPUPS.SEARCH, exchangeTicker);
  }

  /** @inheritdoc */
  getSelectedTickers(): string[] {
    let selected = this._getVisibleSelectedTickers();
    if (selected.length < MIN_SELECTED_TICKERS) {
      selected = [this.getTicker()];
    }
    return selected;
  }

  /** @inheritdoc */
  openBenchmarkTicker(): void {
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

    this.openTicker(`${ticker}/${benchmark}`);
  }

  // FIXME: Add isRecent(ticker) method to be used in TickerHandler

  // FIXME: Add Recent Ticker Method

  // FIXME: Should we move all Recent Related Logic to RecentManager ?

  /** @inheritdoc */
  hasRecentTickers(): boolean {
    return this._recentTickerRepo.getCount() > 0;
  }

  /** @inheritdoc */
  navigateTickers(step: number): void {
    const currentTicker = this.getTicker();
    const visibleTickers = this._getVisibleTickers();

    if (!visibleTickers.length) {
      throw new Error('No visible tickers available for navigation');
    }

    const nextTicker = this._calculateNextTicker(currentTicker, visibleTickers, step);
    this.openTicker(nextTicker);
  }

  /**
   * Gets currently visible tickers based on active view
   * @private
   * @returns {string[]} Array of visible ticker symbols
   */
  private _getVisibleSelectedTickers(): string[] {
    return this._screenerManager.isScreenerVisible()
      ? this._screenerManager.getTickers(true)
      : this._watchlistManager.getTickers(true);
  }

  /**
   * Gets currently visible tickers based on active view
   * @private
   * @returns Array of visible ticker symbols
   */
  private _getVisibleTickers(): string[] {
    return this._screenerManager.isScreenerVisible()
      ? this._screenerManager.getTickers(true)
      : this._watchlistManager.getTickers(true);
  }

  /**
   * Calculates the next ticker based on current position and step
   * @private
   * @param currentTicker - Currently selected ticker
   * @param tickers - Array of available tickers
   * @param step - Number of steps to move
   * @returns Next ticker symbol
   */
  private _calculateNextTicker(currentTicker: string, tickers: string[], step: number): string {
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
