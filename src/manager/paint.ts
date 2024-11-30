import { Constants } from '../models/constant';
import { ICategoryManager } from './category';
import { ITickerManager } from './ticker';
import { IFnoRepo } from '../repo/fno';

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
  applyCss(selector: string, symbolSet: Set<string> | null, css: JQuery.PlainObject, force?: boolean): void;

  /**
   * Apply color to flags for elements matching the selector
   * @param selector The base selector for finding elements
   * @param symbols The set of symbols to filter elements
   * @param color The color to apply
   * @param force If true, apply color regardless of symbols
   */
  paintFlags(selector: string, symbols: Set<string> | null, color: string, force?: boolean): void;

  /**
   * Paint all tickers and their flags based on categories
   * @param selector The selector for ticker elements
   */
  paintTickers(selector: string): void;

  /**
   * Resets the colors of the specified selector to the default color
   * @param selector The selector for the elements to reset the colors
   */
  resetColors(selector: string): void;

  /**
   * Paints all aspects of the current ticker display
   */
  paintHeader(): void;
}

/**
 * Manages painting operations for TradingView elements
 */
export class PaintManager implements IPaintManager {
  /**
   * Creates a new PaintManager instance
   * @param categoryManager Manager for category operations
   * @param tickerManager Manager for ticker operations
   * @param fnoRepo Repository for FNO symbols
   */
  constructor(
    private readonly categoryManager: ICategoryManager,
    private readonly tickerManager: ITickerManager,
    private readonly fnoRepo: IFnoRepo
  ) {}

  /** @inheritdoc */
  applyCss(selector: string, symbolSet: Set<string> | null, css: JQuery.PlainObject, force = false): void {
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
  paintFlags(selector: string, symbols: Set<string> | null, color: string, force = false): void {
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
      .parents(Constants.DOM.WATCHLIST.ITEM)
      .find(Constants.DOM.FLAGS.SYMBOL)
      .css('color', color);
  }

  /** @inheritdoc */
  paintTickers(selector: string): void {
    const colorList = Constants.UI.COLORS.LIST;

    // Paint based on order categories and flag categories
    for (let i = 0; i < colorList.length; i++) {
      const color = colorList[i];

      // Paint orders
      const orderSymbols = this.categoryManager.getWatchCategory(i);
      this.applyCss(selector, orderSymbols, { color: color });

      // Paint flags
      const flagSymbols = this.categoryManager.getFlagCategory(i);
      this.paintFlags(selector, flagSymbols, color);
    }
  }

  /** @inheritdoc */
  resetColors(selector: string): void {
    if (!selector) {
      throw new Error('Selector is required');
    }

    // Reset element colors to default
    this.applyCss(selector, null, { color: Constants.UI.COLORS.DEFAULT }, true);

    // Reset flag colors
    this.paintFlags(selector, null, Constants.UI.COLORS.DEFAULT, true);
  }

  /** @inheritdoc */
  paintHeader(): void {
    const ticker = this.tickerManager.getTicker();
    const exchange = this.tickerManager.getCurrentExchange();

    if (!ticker || !exchange) {
      console.error('Missing required data for painting ticker');
      return;
    }

    const $name = $(Constants.DOM.BASIC.NAME);

    // Paint each component
    this._paintNameElement($name, ticker);
    this._paintFNOMarking($name, ticker);
    this._paintFlagAndExchange(ticker);
  }

  /**
   * Paints the name element with appropriate category color
   * @private
   * @param $name jQuery element for the name
   * @param ticker Ticker symbol
   */
  private _paintNameElement($name: JQuery<HTMLElement>, ticker: string): void {
    $name.css('color', Constants.UI.COLORS.DEFAULT);

    // Paint based on order categories
    for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
      const categorySymbols = this.categoryManager.getWatchCategory(i);
      if (categorySymbols && categorySymbols.has(ticker)) {
        $name.css('color', this._getCategoryColor(i));
        break; // Stop after first matching category
      }
    }
  }

  /**
   * Gets the appropriate color for a category index
   * @private
   * @param index Category index
   * @returns Color for the category
   */
  private _getCategoryColor(index: number): string {
    const colorList = Constants.UI.COLORS.LIST;
    return index === 5 ? colorList[6] : colorList[index];
  }

  /**
   * Paints flag and exchange elements for a ticker
   * @private
   * @param ticker Ticker symbol
   */
  private _paintFlagAndExchange(ticker: string): void {
    const $flag = $(Constants.DOM.FLAGS.MARKING);
    const $exchange = $(Constants.DOM.BASIC.EXCHANGE);

    // Reset colors and set exchange text
    $flag.css('color', Constants.UI.COLORS.DEFAULT);
    $exchange.css('color', Constants.UI.COLORS.DEFAULT);

    // Paint flags and exchange based on flag categories
    Constants.UI.COLORS.LIST.forEach((color, i) => {
      const flagSymbols = this.categoryManager.getFlagCategory(i);
      if (flagSymbols && flagSymbols.has(ticker)) {
        $flag.css('color', color);
        $exchange.css('color', color);
        return false; // Break the loop after first match
      }
    });
  }

  /**
   * Paints FNO marking for a ticker
   * @private
   * @param $name jQuery element for the name
   * @param ticker Ticker symbol
   */
  private _paintFNOMarking($name: JQuery<HTMLElement>, ticker: string): void {
    if (this.fnoRepo.has(ticker)) {
      $name.css(Constants.UI.COLORS.FNO_CSS);
    } else {
      $name.css('border-top-style', '');
      $name.css('border-width', '');
    }
  }
}
