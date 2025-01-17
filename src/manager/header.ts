import { Constants } from '../models/constant';
import { IFnoRepo } from '../repo/fno';
import { IFlagManager } from './flag';
import { IPaintManager } from './paint';
import { ITickerManager } from './ticker';
import { IWatchManager } from './watch';

/**
 * Interface for managing header display operations
 */
export interface IHeaderManager {
  /**
   * Paints all aspects of the current ticker header display
   */
  paintHeader(): void;
}

/**
 * Manages header display operations
 */
export class HeaderManager implements IHeaderManager {
  constructor(
    private readonly paintManager: IPaintManager,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly tickerManager: ITickerManager,
    private readonly fnoRepo: IFnoRepo
  ) {}

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
    this.paintNameElement($name, ticker);
    this.paintFNOMarking($name, ticker);
    this.paintFlagAndExchange(ticker);
  }

  /**
   * Paints the name element with appropriate category color
   * @private
   * @param $name jQuery element for the name
   * @param ticker Ticker symbol
   */
  private paintNameElement($name: JQuery<HTMLElement>, ticker: string): void {
    $name.css('color', Constants.UI.COLORS.DEFAULT);

    // Paint based on order categories
    for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
      const watchSymbols = this.watchManager.getCategory(i);
      if (watchSymbols && watchSymbols.has(ticker)) {
        $name.css('color', this.getCategoryColor(i));
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
  private getCategoryColor(index: number): string {
    const colorList = Constants.UI.COLORS.LIST;
    return index === 5 ? colorList[6] : colorList[index];
  }

  /**
   * Paints flag and exchange elements for a ticker
   * @private
   * @param ticker Ticker symbol
   */
  private paintFlagAndExchange(ticker: string): void {
    const $flag = $(Constants.DOM.FLAGS.MARKING);
    const $exchange = $(Constants.DOM.BASIC.EXCHANGE);

    // Reset colors and set exchange text
    $flag.css('color', Constants.UI.COLORS.DEFAULT);
    $exchange.css('color', Constants.UI.COLORS.DEFAULT);

    // Paint flags based on flag categories
    for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
      const color = Constants.UI.COLORS.LIST[i];
      const flagSymbols = this.flagManager.getCategory(i);
      if (flagSymbols && flagSymbols.has(ticker)) {
        $flag.css('color', color);
        $exchange.css('color', color);
        break; // Break the loop after first match
      }
    }
  }

  private paintFNOMarking($name: JQuery<HTMLElement>, ticker: string): void {
    this.paintManager.paintFNOMarking($name, this.fnoRepo.has(ticker));
  }
}
