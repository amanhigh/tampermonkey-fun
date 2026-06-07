import { Constants } from '../models/constant';
import { IPaintManager } from './paint';
import { IWatchManager } from './watch';
import { IFlagManager } from './flag';
import { IRecentManager } from './recent';
import { ITradingViewWatchlistManager } from './watchlist';
import { ALL_WATCH_CATEGORIES } from '../models/watch';

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
   * Paint the screener display using fresh backend classification.
   */
  paintScreener(): Promise<void>;
}

/**
 * Manages TradingView screener operations
 * @class TradingViewScreenerManager
 */
export class TradingViewScreenerManager implements ITradingViewScreenerManager {
  constructor(
    private readonly paintManager: IPaintManager,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly recentManager: IRecentManager,
    private readonly watchlistManager: ITradingViewWatchlistManager
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
      .map((s) => s.textContent || s.innerHTML);
  }

  /** @inheritdoc */
  isScreenerVisible(): boolean {
    // Check if the screener widget itself is visible in the DOM
    const screenerWidget = $(Constants.DOM.SCREENER.MAIN);
    const widgetExists = screenerWidget.length > 0;
    const widgetVisible = screenerWidget.is(':visible');

    return widgetExists && widgetVisible;
  }

  /**
   * Helper function for retrieving ticker lists
   * @private
   * @param selector - The CSS selector for finding elements
   * @param visible - Whether to only get visible elements
   * @returns Array of ticker strings
   */
  private tickerListHelper(selector: string, visible: boolean): string[] {
    const finalSelector = visible ? selector + ':visible' : selector;
    const elements = $(finalSelector);

    // Use textContent instead of innerHTML to avoid HTML entity encoding issues (M&amp;M → M&M)
    return elements.toArray().map((s) => s.textContent || s.innerHTML);
  }

  /** @inheritdoc */
  async paintScreener(): Promise<void> {
    const screenerSymbolSelector = Constants.DOM.SCREENER.SYMBOL;

    // Must Run in this Order- Clear, WatchList, Kite
    this.paintManager.paintSymbols(screenerSymbolSelector, null, { color: Constants.UI.COLORS.DEFAULT }, true);

    // Paint Recently Watched — compute recent screener tickers directly
    const recentSymbols = this.getTickers(false).filter((t) =>
      this.recentManager.isRecent(t, Constants.RECENT_CUTOFF_MS)
    );
    this.paintManager.paintSymbols(screenerSymbolSelector, new Set(recentSymbols), {
      color: Constants.UI.COLORS.LIST[1],
    });

    // Classify each screener ticker into category buckets
    const screenerTickers = this.getTickers(false);
    const { buckets, uncategorized } = await this.watchManager.classifyTickers(screenerTickers);

    // Paint Symbols in ALL_WATCH_CATEGORIES order
    for (const cat of ALL_WATCH_CATEGORIES) {
      const symbols = buckets.get(cat.id);
      if (symbols?.size) {
        this.paintManager.paintSymbols(screenerSymbolSelector, symbols, { color: cat.color });
      }
    }

    // Paint Flags
    this.flagManager.paint(screenerSymbolSelector, Constants.DOM.SCREENER.ITEM);

    // Apply brown override for uncategorized watchlist tickers (legacy DEFAULT_DAILY)
    const watchlistTickers = this.watchlistManager.getTickers();
    const defaultDailyTickers = new Set(watchlistTickers.filter((t) => uncategorized.has(t)));
    if (defaultDailyTickers.size > 0) {
      this.paintManager.paintSymbols(screenerSymbolSelector, defaultDailyTickers, {
        color: Constants.UI.COLORS.HEADER_DEFAULT,
      });
    }
  }
}
