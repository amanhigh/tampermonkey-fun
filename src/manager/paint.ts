import { LRUCache } from 'lru-cache';
import { DomTickerType } from '../models/dom';
import { Constants } from '../models/constant';

/**
 * Interface for managing painting operations for TradingView elements
 */
export interface IPaintManager {
  /**
   * Apply CSS to elements matching the given selector based on the symbol set
   * @param selector The CSS selector for the elements to be styled
   * @param symbolSet The set of symbols used to filter the elements
   * @param css The CSS properties to be applied
   * @param force If true, apply CSS regardless of symbolSet
   */
  paintSymbols(selector: string, symbolSet: Set<string> | null, css: JQuery.PlainObject, force?: boolean): void;

  /**
   * Apply color to flags for elements matching the selector
   * @param selector The base selector for finding elements
   * @param symbols The set of symbols to filter elements
   * @param color The color to apply
   * @param itemSelector The selector for the item container
   * @param force If true, apply color regardless of symbols
   */
  paintFlags(selector: string, symbols: Set<string> | null, color: string, itemSelector: string, force?: boolean): void;

  /**
   * Resets the colors of the specified selector to the default color
   * @param selector The selector for the elements to reset the colors
   */
  resetColors(selector: string): void;

  /**
   * Paints flag and exchange elements for a ticker
   * @param $name jQuery element for the name
   * @param enabled Enable/disable FNO Style
   * @private
   * @returns void
   */
  paintFNOMarking($name: JQuery<HTMLElement>, enabled: boolean): void;

  /**
   * V1 single-ticker flag painter.
   * Looks up the flag DOM element(s) for the given ticker in the specified
   * panel, resets them to default color, then applies `color` when provided.
   *
   * Uses an internal LRU cache (with fetchMethod) keyed by `type:ticker`
   * to avoid repeated DOM scans.
   *
   * @param type   Which panel to paint (WATCHLIST or SCREENER)
   * @param ticker Ticker symbol to paint
   * @param color  Optional CSS color to apply. When omitted/undefined the
   *               ticker flag is reset to default only.
   */
  paintFlagV1(type: DomTickerType, ticker: string, color?: string): Promise<void>;
}

/**
 * Manages painting operations for TradingView elements
 */
export class PaintManager implements IPaintManager {
  /** @inheritdoc */
  paintSymbols(selector: string, symbolSet: Set<string> | null, css: JQuery.PlainObject, force = false): void {
    if (!selector || !css) {
      throw new Error('Selector and CSS object are required');
    }

    $(selector)
      .filter(function (this: HTMLElement, _: number, element: HTMLElement): boolean {
        if (force) {
          return true;
        }
        return symbolSet ? symbolSet.has(element.innerHTML) : false;
      })
      .css(css);
  }

  /** @inheritdoc */
  paintFlags(selector: string, symbols: Set<string> | null, color: string, itemSelector: string, force = false): void {
    if (!selector) {
      throw new Error('Selector is required');
    }

    $(`${selector}`)
      .filter(function (this: HTMLElement, _: number, element: HTMLElement): boolean {
        if (force) {
          return true;
        }
        return symbols ? symbols.has(element.innerHTML) : false;
      })
      .closest(itemSelector)
      .find(Constants.DOM.FLAGS.SYMBOL)
      .css('color', color);
  }

  /** @inheritdoc */
  public paintFNOMarking($name: JQuery<HTMLElement>, enabled: boolean): void {
    if (enabled) {
      $name.css(Constants.UI.COLORS.FNO_CSS);
    } else {
      $name.css('border-top-style', '');
      $name.css('border-width', '');
    }
  }

  /** @inheritdoc */
  resetColors(selector: string): void {
    // BUG: After Adding to Watchlist Ticker Name (Header) not painted.
    // Reset element colors to default
    this.paintSymbols(selector, null, { color: Constants.UI.COLORS.DEFAULT }, true);

    // Reset flag colors
    this.paintFlags(selector, null, Constants.UI.COLORS.DEFAULT, Constants.DOM.WATCHLIST.ITEM, true);
  }

  // ── V1 Single-Ticker Flag Painter ──

  /**
   * LRU cache mapping `type:ticker` → jQuery flag element collection.
   * On cache miss, fetchMethod scans the requested panel automatically.
   */
  private readonly flagElementCache = new LRUCache<string, JQuery<HTMLElement>>({
    max: Constants.CACHE.CATEGORY.MAX,
    ttl: Constants.CACHE.CATEGORY.TTL_MS,
    fetchMethod: async (key: string): Promise<JQuery<HTMLElement> | undefined> => {
      const [typeStr, ticker] = key.split(':');
      const type = typeStr as DomTickerType;
      return await Promise.resolve(this.lookupFlagElementsForTicker(type, ticker));
    },
  });

  /**
   * Build a cache key from type and ticker.
   */
  private static cacheKey(type: DomTickerType, ticker: string): string {
    return `${type}:${ticker}`;
  }

  /** @inheritdoc */
  async paintFlagV1(type: DomTickerType, ticker: string, color?: string): Promise<void> {
    const $flags = await this.flagElementCache.fetch(PaintManager.cacheKey(type, ticker));
    if (!$flags) {
      return;
    }

    $flags.css('color', Constants.UI.COLORS.DEFAULT);

    if (color) {
      $flags.css('color', color);
    }
  }

  /**
   * Look up flag elements for a single ticker in the given panel.
   * Returns undefined when the ticker is not found in that panel.
   */
  private lookupFlagElementsForTicker(type: DomTickerType, ticker: string): JQuery<HTMLElement> | undefined {
    let symbolSelector: string;
    let itemSelector: string;

    switch (type) {
      case DomTickerType.WATCHLIST:
        symbolSelector = Constants.DOM.WATCHLIST.SYMBOL;
        itemSelector = Constants.DOM.WATCHLIST.ITEM;
        break;
      case DomTickerType.SCREENER:
        symbolSelector = Constants.DOM.SCREENER.SYMBOL;
        itemSelector = Constants.DOM.SCREENER.ITEM;
        break;
    }

    const $flags = $(symbolSelector)
      .filter((_: number, element: HTMLElement) => (element.textContent || element.innerHTML) === ticker)
      .closest(itemSelector)
      .find(Constants.DOM.FLAGS.SYMBOL);

    return $flags.length > 0 ? $flags : undefined;
  }
}
