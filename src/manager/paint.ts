import { TickerArea, TickerVisibility } from '../models/dom';
import { ICategoryManager } from './category';
import { IDomManager } from './dom';
import { IDisplayManager } from './display';
import { IRecentManager } from './recent';
import { Constants } from '../models/constant';
import { BucketSummary, WatchCategoryId, WatchCategory } from '../models/watch';
import { TickerCategory } from '../models/category';

/**
 * Interface for managing painting operations for TradingView elements
 */
export interface IPaintManager {
  /**
   * Full visual repaint of all visible panels.
   * Paints WATCHLIST, then paints SCREENER if visible,
   * then repaints the current ticker header.
   */
  paint(): Promise<void>;

  /**
   * Targeted paint for one or more tickers.
   * Paints the tickers in WATCHLIST and also in SCREENER
   * when the screener is visible. Repaints the current ticker
   * header at the end.
   * @param tickers Ticker symbols to repaint
   */
  paintTickers(tickers: string[]): Promise<void>;

  /**
   * Repaint only the current ticker's header (name, flag, exchange, FNO).
   * Uses DisplayManager.resolve() to pick the correct color.
   * Called by internal paint paths and by the header-replacement DOM observer.
   */
  paintHeader(): Promise<void>;

  /**
   * Classifies all tickers in the WATCHLIST and returns bucket counts
   * WITHOUT resetting or painting DOM. Use when summary labels need
   * refreshing after targeted ticker repaints.
   */
  summarizeBuckets(): Promise<BucketSummary>;
}

/**
 * Context for painting all tickers in a single area.
 * Bundles area metadata, DOM selectors, and screener-only data.
 * @internal
 */
interface AreaPaintContext {
  readonly area: TickerArea;
  readonly itemSelector: string;
  readonly flagSelector: string;
  readonly watchlistTickerSet: Set<string> | undefined;
  readonly recentTickers: Set<string> | undefined;
}

/**
 * Manages painting operations for TradingView elements.
 * Orchestrates ticker symbol + flag + FNO painting per area.
 */
export class PaintManager implements IPaintManager {
  constructor(
    private readonly domManager: IDomManager,
    private readonly categoryManager: ICategoryManager,
    private readonly recentManager: IRecentManager,
    private readonly displayManager: IDisplayManager
  ) {}

  /** @inheritdoc */
  async paint(): Promise<void> {
    await this.paintArea(TickerArea.WATCHLIST);

    if (this.domManager.isScreenerVisible()) {
      await this.paintArea(TickerArea.SCREENER);
    }

    await this.paintHeader();
  }

  /** @inheritdoc */
  async paintTickers(tickers: string[]): Promise<void> {
    if (tickers.length === 0) {
      return;
    }

    await this.paintTickersInArea(TickerArea.WATCHLIST, tickers);

    if (this.domManager.isScreenerVisible()) {
      await this.paintTickersInArea(TickerArea.SCREENER, tickers);
    }

    // Header shows the current ticker's categories
    await this.paintHeader();
  }

  /** @inheritdoc */
  async summarizeBuckets(): Promise<BucketSummary> {
    const tickers = [...this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL)];
    const buckets = new Map<WatchCategoryId, number>();
    const uncategorizedTickers: string[] = [];

    const categoryMap = await this.categoryManager.getBatchCategory(tickers);
    for (const ticker of tickers) {
      const { watch: watchCat } = categoryMap.get(ticker)!;
      this.recordBucketSummary(buckets, uncategorizedTickers, ticker, watchCat);
    }

    return this.toBucketSummary(buckets, uncategorizedTickers);
  }

  // ── Private painters ──

  /**
   * Reset all visual state (symbol color, flag color, F&O border)
   * for every ticker in the given panel area back to defaults.
   */
  private resetArea(panel: TickerArea): void {
    const selector = panel.getSymbolSelector(TickerVisibility.ALL);
    const itemSelector = panel.getItemSelector();
    const flagSelector = panel.getFlagSelector();

    // Reset symbol color
    $(selector).css('color', Constants.UI.COLORS.DEFAULT);

    // Reset flag color
    $(selector).closest(itemSelector).find(flagSelector).css('color', Constants.UI.COLORS.DEFAULT);

    // Reset F&O border style
    $(selector).css('border-top-style', '');
    $(selector).css('border-width', '');
  }

  /**
   * Paint all tickers in the given area (WATCHLIST or SCREENER).
   * Resets the area first, then resolves watch + flag categories
   * and paints symbol + flag + FNO for every ticker.
   */
  private async paintArea(area: TickerArea): Promise<void> {
    this.resetArea(area);

    const tickers = [...this.domManager.getTickers(area, TickerVisibility.ALL)];
    await this.paintTickersInArea(area, tickers);
  }

  // ── Internal helpers ──

  /**
   * Paint a set of tickers within a single area.
   * Shared by paintArea (full reset+repaint) and paintTickers (targeted).
   */
  private async paintTickersInArea(area: TickerArea, tickers: string[]): Promise<void> {
    if (tickers.length === 0) {
      return;
    }

    const context = await this.buildAreaPaintContext(area, tickers);

    // Fetch all categories in parallel (10 concurrent) before touching DOM
    const categoryMap = await this.categoryManager.getBatchCategory(tickers);

    for (const ticker of tickers) {
      const $symbol = this.findSingleSymbol(area, ticker);
      if ($symbol.length === 0) {
        continue;
      }

      const categories = categoryMap.get(ticker)!;
      this.resetTickerVisuals($symbol, context);
      const symbolColor = this.resolveSymbolColor(categories.watch, ticker, context);
      this.paintTickerVisuals(ticker, categories, symbolColor, context, $symbol);
    }
  }

  /** @inheritdoc */
  public async paintHeader(): Promise<void> {
    const ticker = this.domManager.getTicker();

    const $name = $(Constants.DOM.BASIC.NAME);
    const $flag = $(Constants.DOM.FLAGS.MARKING);
    const $exchange = $(Constants.DOM.BASIC.EXCHANGE);

    // Reset header elements
    $name.css('color', Constants.UI.COLORS.DEFAULT);
    $flag.css('color', Constants.UI.COLORS.DEFAULT);
    $exchange.css('color', Constants.UI.COLORS.DEFAULT);

    // Fetch categories via unified manager (flag and FNO still needed here)
    const { flag: flagCategory, isFno } = await this.categoryManager.getTickerCategory(ticker);

    // Paint name — delegate color decision to shared display manager
    const displayInfo = await this.displayManager.resolve(ticker);
    $name.css('color', displayInfo.color);

    // Paint flag and exchange — flag category color
    if (flagCategory) {
      $flag.css('color', flagCategory.color);
      $exchange.css('color', flagCategory.color);
    }

    // FNO marking on header name
    this.applyFnoBorder($name, isFno);
  }

  // ── Area context ──

  /**
   * Build painting context for an entire area, including DOM selectors
   * and screener-only data (watchlist ticker set, recent tickers).
   */
  private async buildAreaPaintContext(area: TickerArea, tickers: string[]): Promise<AreaPaintContext> {
    let watchlistTickerSet: Set<string> | undefined;
    let recentTickers: Set<string> | undefined;
    if (area === TickerArea.SCREENER) {
      watchlistTickerSet = new Set([...this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL)]);
      const recentResults = await Promise.all(
        tickers.map(async (t) => ({ t, recent: await this.recentManager.isRecent(t, Constants.RECENT_CUTOFF_MS) }))
      );
      recentTickers = new Set(recentResults.filter((r) => r.recent).map((r) => r.t));
    }
    return {
      area,
      itemSelector: area.getItemSelector(),
      flagSelector: area.getFlagSelector(),
      watchlistTickerSet,
      recentTickers,
    };
  }

  // ── Per-ticker workflow ──

  /**
   * Record a ticker's watch category in the bucket counts.
   * Uncategorized tickers are added to the uncategorized list.
   */
  private recordBucketSummary(
    buckets: Map<WatchCategoryId, number>,
    uncategorizedTickers: string[],
    ticker: string,
    watchCat: WatchCategory | undefined
  ): void {
    if (watchCat) {
      buckets.set(watchCat.id, (buckets.get(watchCat.id) ?? 0) + 1);
    } else {
      uncategorizedTickers.push(ticker);
    }
  }

  /**
   * Resolve the symbol text color for a ticker with priority:
   * watch category color → screener watchlist fallback brown → screener recent → default.
   */
  private resolveSymbolColor(watchCat: WatchCategory | undefined, ticker: string, context: AreaPaintContext): string {
    if (watchCat) {
      return watchCat.color;
    }
    if (context.area === TickerArea.SCREENER && context.watchlistTickerSet!.has(ticker)) {
      return Constants.UI.COLORS.HEADER_DEFAULT;
    }
    if (context.area === TickerArea.SCREENER && context.recentTickers!.has(ticker)) {
      return Constants.UI.COLORS.SCREENER_RECENT;
    }
    return Constants.UI.COLORS.DEFAULT;
  }

  /**
   * Paint all visuals (symbol color, FNO border, flag color) for a
   * single ticker using the context's pre-computed selectors.
   * Accepts an optional pre-resolved $symbol to avoid re-querying the DOM.
   */
  private paintTickerVisuals(
    ticker: string,
    categories: TickerCategory,
    symbolColor: string,
    context: AreaPaintContext,
    $symbol?: JQuery<HTMLElement>
  ): void {
    if (!$symbol || $symbol.length === 0) {
      $symbol = this.findSingleSymbol(context.area, ticker);
      if ($symbol.length === 0) {
        return;
      }
    }

    this.paintSymbolColor($symbol, symbolColor);
    this.paintFnoBorder($symbol, categories.isFno);
    this.paintSingleFlag($symbol, context.itemSelector, context.flagSelector, categories.flag?.color);
  }

  // ── Summary output ──

  /**
   * Convert internal bucket accumulator to the public BucketSummary type.
   */
  private toBucketSummary(buckets: Map<WatchCategoryId, number>, uncategorizedTickers: string[]): BucketSummary {
    return { buckets, uncategorizedCount: uncategorizedTickers.length };
  }

  // ── Single-ticker painters ──

  /**
   * Reset visual state (symbol color, flag color, F&O border) for a
   * single ticker row back to defaults.
   */
  private resetTickerVisuals($symbol: JQuery<HTMLElement>, context: AreaPaintContext): void {
    // Reset symbol color
    $symbol.css('color', Constants.UI.COLORS.DEFAULT);

    // Reset flag color
    $symbol.closest(context.itemSelector).find(context.flagSelector).css('color', Constants.UI.COLORS.DEFAULT);

    // Clear F&O border style
    $symbol.css('border-top-style', '');
    $symbol.css('border-width', '');
  }

  /**
   * Find the symbol DOM element for a ticker in the given area.
   * @returns jQuery collection (may be empty if ticker not found)
   */
  private findSingleSymbol(area: TickerArea, ticker: string): JQuery<HTMLElement> {
    return $(area.getSymbolSelector(TickerVisibility.ALL)).filter(
      (_: number, el: HTMLElement) => (el.textContent || el.innerHTML) === ticker
    );
  }

  /**
   * Paint the symbol text color for a single ticker.
   * resetArea already set all symbols to default; this only overrides if non-default.
   */
  private paintSymbolColor($symbol: JQuery<HTMLElement>, color: string): void {
    if (color !== Constants.UI.COLORS.DEFAULT) {
      $symbol.css('color', color);
    }
  }

  /**
   * Paint the F&O border on a single ticker's symbol element.
   * No-op if the ticker is not F&O (resetArea already cleared the border).
   */
  private paintFnoBorder($symbol: JQuery<HTMLElement>, isFno: boolean): void {
    if (isFno) {
      $symbol.css(Constants.UI.COLORS.FNO_CSS);
    }
  }

  /**
   * Paint the flag for a single ticker, deriving the flag element from
   * the ticker row (resetArea already set default; only override if present).
   */
  private paintSingleFlag(
    $symbol: JQuery<HTMLElement>,
    itemSelector: string,
    flagSelector: string,
    flagColor?: string
  ): void {
    if (!flagColor) {
      return;
    }
    const $flags = $symbol.closest(itemSelector).find(flagSelector);
    if ($flags.length > 0) {
      $flags.css('color', flagColor);
    }
  }

  /**
   * Apply or clear F&O border style on a header element.
   */
  private applyFnoBorder($element: JQuery<HTMLElement>, enabled: boolean): void {
    if (enabled) {
      $element.css(Constants.UI.COLORS.FNO_CSS);
    } else {
      $element.css('border-top-style', '');
      $element.css('border-width', '');
    }
  }
}
