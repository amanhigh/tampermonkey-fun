import { LRUCache } from 'lru-cache';
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
   * Looks up the flag DOM element(s) for the given ticker, resets them to
   * default color, then applies `color` when provided.
   *
   * Uses an internal LRU cache (with fetchMethod) to avoid repeated DOM scans.
   *
   * @param ticker Ticker symbol to paint
   * @param color  Optional CSS color to apply. When omitted/undefined the
   *               ticker flag is reset to default only.
   */
  paintFlagV1(ticker: string, color?: string): Promise<void>;
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
   * LRU cache mapping ticker → jQuery flag element collection.
   * On cache miss, fetchMethod scans the DOM automatically (watchlist → screener).
   */
  private readonly flagElementCache = new LRUCache<string, JQuery<HTMLElement>>({
    max: Constants.CACHE.CATEGORY.MAX,
    ttl: Constants.CACHE.CATEGORY.TTL_MS,
    fetchMethod: async (ticker: string): Promise<JQuery<HTMLElement> | undefined> => {
      return await Promise.resolve(this.lookupFlagElementsForTicker(ticker));
    },
  });

  /** @inheritdoc */
  async paintFlagV1(ticker: string, color?: string): Promise<void> {
    const $flags = await this.flagElementCache.fetch(ticker);
    if (!$flags) {
      return;
    }

    $flags.css('color', Constants.UI.COLORS.DEFAULT);

    if (color) {
      $flags.css('color', color);
    }
  }

  /**
   * Search watchlist and screener DOM for flag elements matching `ticker`.
   * Returns combined flag elements from both panels, or undefined when the
   * ticker is not present in either.
   */
  private lookupFlagElementsForTicker(ticker: string): JQuery<HTMLElement> | undefined {
    const $watch = this.findFlagInSelector(ticker, Constants.DOM.WATCHLIST.SYMBOL, Constants.DOM.WATCHLIST.ITEM);
    const $screen = this.findFlagInSelector(ticker, Constants.DOM.SCREENER.SYMBOL, Constants.DOM.SCREENER.ITEM);

    if ($watch.length === 0 && $screen.length === 0) {
      return undefined;
    }

    // Combine both collections — same ticker in both panels gets both painted
    return $watch.length > 0 ? $watch.add($screen) : $screen;
  }

  /**
   * Find flag elements for a single ticker within a given symbol/item selector pair.
   */
  private findFlagInSelector(ticker: string, symbolSelector: string, itemSelector: string): JQuery<HTMLElement> {
    return $(symbolSelector)
      .filter((_: number, element: HTMLElement) => (element.textContent || element.innerHTML) === ticker)
      .closest(itemSelector)
      .find(Constants.DOM.FLAGS.SYMBOL);
  }
}
