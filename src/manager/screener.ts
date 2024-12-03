import { Constants } from '../models/constant';
import { IPaintManager } from './paint';
import { IFnoRepo } from '../repo/fno';
import { IWatchManager } from './watch';

/**
 * Interface for managing TradingView screener operations
 */
export interface ITradingViewScreenerManager {
  /**
   * Get tickers from screener
   * @param visible Whether to only get visible tickers
   * @returns Array of screener tickers
   */
  getTickers(visible?: boolean): string[];

  /**
   * Get selected tickers from screener
   * @returns Array of selected ticker symbols
   */
  getSelectedTickers(): string[];

  /**
   * Check if screener is currently visible
   * @returns True if screener is visible
   */
  isScreenerVisible(): boolean;

  /**
   * Paint the screener display
   */
  paintScreener(): void;
}

/**
 * Manages TradingView screener operations
 * @class TradingViewScreenerManager
 */
export class TradingViewScreenerManager implements ITradingViewScreenerManager {
  constructor(
    private readonly paintManager: IPaintManager,
    private readonly watchManager: IWatchManager,
    private readonly fnoRepo: IFnoRepo
  ) {}

  /** @inheritdoc */
  getTickers(visible = false): string[] {
    const selector = Constants.DOM.SCREENER.SYMBOL;
    return this._tickerListHelper(selector, visible);
  }

  /** @inheritdoc */
  getSelectedTickers(): string[] {
    const screener = Constants.DOM.SCREENER;
    return $(`${screener.SELECTED} ${screener.SYMBOL}:visible`)
      .toArray()
      .map((s) => s.innerHTML);
  }

  /** @inheritdoc */
  isScreenerVisible(): boolean {
    return $(Constants.DOM.SCREENER.BUTTON).attr('data-active') === 'false';
  }

  /**
   * Helper function for retrieving ticker lists
   * @private
   * @param selector - The CSS selector for finding elements
   * @param visible - Whether to only get visible elements
   * @returns Array of ticker strings
   */
  private _tickerListHelper(selector: string, visible: boolean): string[] {
    return $(visible ? selector + ':visible' : selector)
      .toArray()
      .map((s) => s.innerHTML);
  }

  /** @inheritdoc */
  paintScreener(): void {
    const screenerSymbolSelector = Constants.DOM.SCREENER.SYMBOL;
    const colorList = Constants.UI.COLORS.LIST;

    // Must Run in this Order- Clear, WatchList, Kite
    // FIXME: Need Reset or Handled in WatchListHandler ?
    // this.paintManager.resetColors(screenerSymbolSelector);

    // Paint Recently Watched
    // FIXME: Call from Recent Manager in Handler.

    // Paint Symbols
    const fnoSymbols = this.fnoRepo.getAll();
    this.paintManager.paintSymbols(screenerSymbolSelector, fnoSymbols, Constants.UI.COLORS.FNO_CSS);

    // Paint Flags
    // FIXME: Flag Painting in Screener

    // Paint Watchlist (Overwrite White)
    const watchlistSet = this.watchManager.getDefaultWatchlist();
    this.paintManager.paintSymbols(screenerSymbolSelector, watchlistSet, { color: colorList[6] });
  }
}
