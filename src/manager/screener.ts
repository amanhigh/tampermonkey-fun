import { Constants } from '../models/constant';
import { IPaintManager } from './paint';
import { IWatchManager } from './watch';
import { IFlagManager } from './flag';

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
    private readonly flagManager: IFlagManager
  ) {}

  /** @inheritdoc */
  getTickers(visible = false): string[] {
    const selector = Constants.DOM.SCREENER.SYMBOL;
    return this.tickerListHelper(selector, visible);
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
  private tickerListHelper(selector: string, visible: boolean): string[] {
    return $(visible ? selector + ':visible' : selector)
      .toArray()
      .map((s) => s.innerHTML);
  }

  /** @inheritdoc */
  paintScreener(): void {
    const screenerSymbolSelector = Constants.DOM.SCREENER.SYMBOL;
    const colorList = Constants.UI.COLORS.LIST;

    // Must Run in this Order- Clear, WatchList, Kite
    this.paintManager.paintSymbols(screenerSymbolSelector, null, { color: Constants.UI.COLORS.DEFAULT }, true);

    // Paint Recently Watched
    // TODO: Call from Recent Manager in Handler.

    // Paint Symbols
    // HACK: #B Extract common painting logic ?
    for (let i = 0; i < colorList.length; i++) {
      const color = colorList[i];
      const symbols = this.watchManager.getCategory(i);
      this.paintManager.paintSymbols(screenerSymbolSelector, symbols, { color: color });
    }

    // Paint Flags
    this.flagManager.paint(screenerSymbolSelector);

    // Paint Watchlist (Overwrite White)
    const watchlistSet = this.watchManager.getDefaultWatchlist();
    this.paintManager.paintSymbols(screenerSymbolSelector, watchlistSet, { color: colorList[6] });
  }
}
