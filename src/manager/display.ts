import { DisplayState, DisplayInfo, DisplaySurface, DisplayRequest } from '../models/display';
import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { ICategoryManager } from './category';
import { IDomManager } from './dom';
import { IRecentManager } from './recent';

/**
 * Display-state resolver for header name and alert feed.
 * Watchlist/screener symbol colors are resolved directly by PaintManager.
 *
 * Priority order:
 *   1 ticker=null                            → UNMAPPED / red
 *   2 watch category + in DOM watchlist      → WATCH_CATEGORY / category color
 *   3 alert feed + recent                    → RECENT / gold
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
    const { ticker, surface } = request;

    // Priority 1: Unmapped
    if (ticker === null) {
      return { state: DisplayState.UNMAPPED, color: 'firebrick' };
    }

    // Fetch watch category
    const category = await this.categoryManager.getTickerCategory(ticker);
    const watchCat = category.watch;

    // Priority 2: Watch category + in DOM watchlist
    if (watchCat) {
      if (surface === DisplaySurface.HEADER_NAME) {
        // Header always uses watch category color when one exists
        return { state: DisplayState.WATCH_CATEGORY, color: watchCat.color };
      }
      // ALERT_FEED_ROW requires DOM watchlist membership
      const isInWatchlist = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL).has(ticker);
      if (isInWatchlist) {
        return { state: DisplayState.WATCH_CATEGORY, color: watchCat.color };
      }
    }

    // Priority 3: Alert feed only and recent
    if (surface === DisplaySurface.ALERT_FEED_ROW) {
      const isRecent = await this.recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS);
      if (isRecent) {
        return { state: DisplayState.RECENT, color: 'gold' };
      }
    }

    // Priority 4: Default
    return { state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT };
  }
}
