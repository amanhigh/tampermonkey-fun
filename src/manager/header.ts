import { Constants } from '../models/constant';
import { IFlagManager } from './flag';
import { IFnoManager } from './fno';
import { IPaintManager } from './paint';
import { IDomManager } from './dom';
import { IWatchManager } from './watch';
import { ITradingViewWatchlistManager } from './watchlist';

/**
 * Interface for managing header display operations
 */
export interface IHeaderManager {
  /**
   * Paints all aspects of the current ticker header display
   */
  paintHeader(): Promise<void>;
}

/**
 * Manages header display operations
 */
export class HeaderManager implements IHeaderManager {
  constructor(
    private readonly paintManager: IPaintManager,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly domManager: IDomManager,
    private readonly fnoManager: IFnoManager,
    private readonly watchlistManager: ITradingViewWatchlistManager
  ) {}

  /** @inheritdoc */
  async paintHeader(): Promise<void> {
    const ticker = this.domManager.getTicker();
    const $name = $(Constants.DOM.BASIC.NAME);

    // Paint each component
    await this.paintNameElement($name, ticker);
    this.paintFNOMarking($name, ticker);
    this.paintFlagAndExchange(ticker);
  }

  /**
   * Paints the name element with appropriate category color.
   *
   * If the ticker has a backend-derived category, use its color.
   * If it has no category but is in the DOM watchlist, apply brown
   * (legacy DEFAULT_DAILY fallback). Otherwise use default white.
   * @private
   * @param $name jQuery element for the name
   * @param ticker Ticker symbol
   */
  private async paintNameElement($name: JQuery<HTMLElement>, ticker: string): Promise<void> {
    $name.css('color', Constants.UI.COLORS.DEFAULT);

    // Fetch category from backend (no watchlist list passed)
    const category = await this.watchManager.getTickerCategory(ticker);

    if (category) {
      $name.css('color', category.color);
    } else if (this.watchlistManager.getTickers().includes(ticker)) {
      // UI fallback: uncategorized ticker in the watchlist → brown
      $name.css('color', Constants.UI.COLORS.HEADER_DEFAULT);
    }
    // else: stays default white
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

    // Paint flags based on flag category
    const category = this.flagManager.getTickerCategory(ticker);
    if (category) {
      $flag.css('color', category.color);
      $exchange.css('color', category.color);
    }
  }

  private paintFNOMarking($name: JQuery<HTMLElement>, ticker: string): void {
    this.paintManager.paintFNOMarking($name, this.fnoManager.isFno(ticker));
  }
}
