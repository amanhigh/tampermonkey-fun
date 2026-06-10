import { LRUCache } from 'lru-cache';
import { TickerArea, TickerVisibility } from '../models/dom';
import { IWatchManager } from './watch';
import { IFlagManager } from './flag';
import { IDomManager } from './dom';
import { IFnoManager } from './fno';
import { IRecentManager } from './recent';
import { Constants } from '../models/constant';
import { CategoryBuckets, WatchCategoryId } from '../models/watch';

/**
 * Interface for managing painting operations for TradingView elements
 */
export interface IPaintManager {
  /**
   * Resets all visual state (symbol color, flag color, F&O border)
   * for every ticker in the given panel area back to defaults.
   * @param panel Which panel to reset
   */
  resetArea(panel: TickerArea): void;

  /**
   * Paints all tickers in the given area (WATCHLIST or SCREENER).
   * For each ticker, resolves watch category, flag category, FNO status,
   * and paints symbol + flag in one pass. Returns watch-category buckets
   * for the paint caller to use (e.g. UI summary labels).
   * @param area Which panel to paint (WATCHLIST or SCREENER)
   */
  paintArea(area: TickerArea): Promise<CategoryBuckets>;

  /**
   * Paints the current ticker header (name, flag, exchange, FNO).
   * Resolves watch category + flag category + FNO status internally.
   */
  paintHeader(): Promise<void>;
}

/**
 * Manages painting operations for TradingView elements.
 * Orchestrates ticker symbol + flag + FNO painting per area.
 */
export class PaintManager implements IPaintManager {
  constructor(
    private readonly domManager: IDomManager,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly fnoManager: IFnoManager,
    private readonly recentManager: IRecentManager
  ) {}

  /** @inheritdoc */
  resetArea(panel: TickerArea): void {
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

  // ── Area-wide painters ──

  /** @inheritdoc */
  async paintArea(area: TickerArea): Promise<CategoryBuckets> {
    // Reset all elements in this area before painting
    this.resetArea(area);

    const tickers = [...this.domManager.getTickers(area, TickerVisibility.ALL)];

    const buckets = new Map<WatchCategoryId, Set<string>>();
    const uncategorized = new Set<string>();

    // For screener, cache watchlist tickers for brown fallback + compute recent set
    let watchlistTickerSet: Set<string> | undefined;
    let recentTickers: Set<string> | undefined;
    if (area === TickerArea.SCREENER) {
      watchlistTickerSet = new Set([...this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL)]);
      recentTickers = new Set(tickers.filter((t) => this.recentManager.isRecent(t, Constants.RECENT_CUTOFF_MS)));
    }

    for (const ticker of tickers) {
      const [watchCat, flagCat] = await Promise.all([
        this.watchManager.getTickerCategory(ticker),
        this.flagManager.getTickerCategory(ticker),
      ]);

      // Build watch-category buckets
      if (watchCat) {
        const set = buckets.get(watchCat.id) ?? new Set<string>();
        set.add(ticker);
        buckets.set(watchCat.id, set);
      } else {
        uncategorized.add(ticker);
      }

      // Resolve symbol color with priority
      let symbolColor = Constants.UI.COLORS.DEFAULT;
      if (watchCat) {
        symbolColor = watchCat.color;
      } else if (area === TickerArea.SCREENER && watchlistTickerSet!.has(ticker)) {
        // Legacy DEFAULT_DAILY fallback: uncategorized ticker in watchlist → brown in screener
        symbolColor = Constants.UI.COLORS.HEADER_DEFAULT;
      } else if (area === TickerArea.SCREENER && recentTickers!.has(ticker)) {
        symbolColor = Constants.UI.COLORS.SCREENER_RECENT;
      }

      // Paint symbol, flag, and FNO border in one pass per ticker
      this.paintSingleSymbol(area, ticker, symbolColor);

      // FNO border
      if (this.fnoManager.isFno(ticker)) {
        this.paintSingleSymbolBorder(area, ticker);
      }

      // Flag
      await this.paintSingleFlag(area, ticker, flagCat?.color);
    }

    return { buckets, uncategorized };
  }

  /** @inheritdoc */
  async paintHeader(): Promise<void> {
    const ticker = this.domManager.getTicker();
    const $name = $(Constants.DOM.BASIC.NAME);
    const $flag = $(Constants.DOM.FLAGS.MARKING);
    const $exchange = $(Constants.DOM.BASIC.EXCHANGE);

    // Reset header elements
    $name.css('color', Constants.UI.COLORS.DEFAULT);
    $flag.css('color', Constants.UI.COLORS.DEFAULT);
    $exchange.css('color', Constants.UI.COLORS.DEFAULT);

    // Fetch categories in parallel
    const [watchCategory, flagCategory] = await Promise.all([
      this.watchManager.getTickerCategory(ticker),
      this.flagManager.getTickerCategory(ticker),
    ]);

    // Paint name — watch category color, or brown fallback if in watchlist
    if (watchCategory) {
      $name.css('color', watchCategory.color);
    } else {
      const watchlistTickers = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);
      if (watchlistTickers.has(ticker)) {
        $name.css('color', Constants.UI.COLORS.HEADER_DEFAULT);
      }
    }

    // Paint flag and exchange — flag category color
    if (flagCategory) {
      $flag.css('color', flagCategory.color);
      $exchange.css('color', flagCategory.color);
    }

    // FNO marking on header name (private helper)
    this.applyFnoBorder($name, this.fnoManager.isFno(ticker));
  }

  // ── Single-ticker painters ──

  /**
   * Paint the symbol text for a single ticker in the given area.
   * Resets to default, then applies color when provided.
   */
  private paintSingleSymbol(area: TickerArea, ticker: string, color?: string): void {
    const $symbol = $(area.getSymbolSelector(TickerVisibility.ALL)).filter(
      (_: number, el: HTMLElement) => (el.textContent || el.innerHTML) === ticker
    );

    if ($symbol.length === 0) {
      return;
    }

    $symbol.css('color', Constants.UI.COLORS.DEFAULT);
    if (color) {
      $symbol.css('color', color);
    }
  }

  /**
   * Apply FNO border style to a single ticker's symbol element.
   */
  private paintSingleSymbolBorder(area: TickerArea, ticker: string): void {
    const $symbol = $(area.getSymbolSelector(TickerVisibility.ALL)).filter(
      (_: number, el: HTMLElement) => (el.textContent || el.innerHTML) === ticker
    );

    if ($symbol.length > 0) {
      $symbol.css(Constants.UI.COLORS.FNO_CSS);
    }
  }

  /**
   * Apply or clear F&O border style on a header element.
   * @private
   */
  private applyFnoBorder($element: JQuery<HTMLElement>, enabled: boolean): void {
    if (enabled) {
      $element.css(Constants.UI.COLORS.FNO_CSS);
    } else {
      $element.css('border-top-style', '');
      $element.css('border-width', '');
    }
  }

  // ── Single-Ticker Flag Painter ──

  /**
   * LRU cache mapping `area.id:ticker` → jQuery flag element collection.
   * On cache miss, fetchMethod scans the requested panel automatically.
   */
  private readonly flagElementCache = new LRUCache<string, JQuery<HTMLElement>>({
    max: Constants.CACHE.CATEGORY.MAX,
    ttl: Constants.CACHE.CATEGORY.TTL_MS,
    fetchMethod: async (key: string): Promise<JQuery<HTMLElement> | undefined> => {
      const separatorIdx = key.indexOf(':');
      const areaId = key.substring(0, separatorIdx) as keyof typeof TickerArea;
      const ticker = key.substring(separatorIdx + 1);
      const area = TickerArea[areaId];
      if (!area) {
        return undefined;
      }
      return await Promise.resolve(this.lookupFlagElementsForTicker(area, ticker));
    },
  });

  /**
   * Build a cache key from area and ticker.
   */
  private static cacheKey(area: TickerArea, ticker: string): string {
    return `${area.id}:${ticker}`;
  }

  /**
   * Paint the flag for a single ticker. Uses LRU cache for DOM lookup.
   */
  private async paintSingleFlag(area: TickerArea, ticker: string, color?: string): Promise<void> {
    const $flags = await this.flagElementCache.fetch(PaintManager.cacheKey(area, ticker));
    if (!$flags) {
      return;
    }

    $flags.css('color', Constants.UI.COLORS.DEFAULT);
    if (color) {
      $flags.css('color', color);
    }
  }

  /**
   * Scan the panel for flag elements belonging to the given ticker.
   * Returns undefined when the ticker is not found in that panel.
   */
  private lookupFlagElementsForTicker(area: TickerArea, ticker: string): JQuery<HTMLElement> | undefined {
    const $flags = $(area.getSymbolSelector(TickerVisibility.ALL))
      .filter((_: number, element: HTMLElement) => (element.textContent || element.innerHTML) === ticker)
      .closest(area.getItemSelector())
      .find(area.getFlagSelector());

    return $flags.length > 0 ? $flags : undefined;
  }
}
