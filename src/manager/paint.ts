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
    // Reset element colors to default
    this.paintSymbols(selector, null, { color: Constants.UI.COLORS.DEFAULT }, true);

    // Reset flag colors
    this.paintFlags(selector, null, Constants.UI.COLORS.DEFAULT, Constants.DOM.WATCHLIST.ITEM, true);
  }
}
