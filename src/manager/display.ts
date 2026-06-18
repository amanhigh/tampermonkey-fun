import { DisplayState, DisplayInfo, DisplaySurface, DisplayRequest } from '../models/display';
import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { ICategoryManager } from './category';
import { IDomManager } from './dom';
import { IRecentManager } from './recent';

/**
 * Shared display-state resolver for all visual surfaces.
 * Centralizes the mapping from ticker state to display colors for
 * header/name, watchlist, screener, and alert feed.
 *
 * Priority order:
 *   1 ticker=null                            → UNMAPPED / red
 *   2 watch category + in DOM watchlist      → WATCH_CATEGORY / category color
 *   3 alert feed + recent                    → RECENT / lime
 *   4 everything else                        → DEFAULT / white
 */
export interface IDisplayManager {
  /** Resolve display info for a ticker on a given surface. */
  resolve(request: DisplayRequest): Promise<DisplayInfo>;
}

/**
 * Implementation of IDisplayManager.
 */
export class DisplayManager implements IDisplayManager {
  constructor(
    private readonly categoryManager: ICategoryManager,
    private readonly domManager: IDomManager,
    private readonly recentManager: IRecentManager
  ) {}

  /** @inheritdoc */
  async resolve(request: DisplayRequest): Promise<DisplayInfo> {
    const { ticker, surface, category: preloadedCategory, watchlistTickers, recentTickers } = request;

    // Priority 1: Unmapped
    if (ticker === null) {
      return { state: DisplayState.UNMAPPED, color: 'red' };
    }

    // Resolve watch category from preloaded data or fresh fetch
    let watchCat = preloadedCategory?.watch;
    if (preloadedCategory === undefined) {
      const category = await this.categoryManager.getTickerCategory(ticker);
      watchCat = category.watch;
    }

    // Determine DOM watchlist membership
    let isInWatchlist: boolean;
    if (watchlistTickers) {
      isInWatchlist = watchlistTickers.has(ticker);
    } else {
      isInWatchlist = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL).has(ticker);
    }

    // Priority 2: Watch category + in DOM watchlist
    if (watchCat && isInWatchlist) {
      return { state: DisplayState.WATCH_CATEGORY, color: watchCat.color };
    }

    // Priority 3: Alert feed only and recent
    if (surface === DisplaySurface.ALERT_FEED_ROW) {
      let isRecent: boolean;
      if (recentTickers) {
        isRecent = recentTickers.has(ticker);
      } else {
        isRecent = await this.recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS);
      }
      if (isRecent) {
        return { state: DisplayState.RECENT, color: 'lime' };
      }
    }

    // Priority 4: Default
    return { state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT };
  }
}
