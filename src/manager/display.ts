import { FeedState } from '../models/alertfeed';
import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { WatchCategory } from '../models/watch';
import { ICategoryManager } from './category';
import { IDomManager } from './dom';
import { IRecentManager } from './recent';

/**
 * Target area for display resolution.
 * ALERT_FEED — Investing.com alert feed row colors
 * HEADER — current ticker header name color
 * SCREENER — screener panel ticker row colors
 */
export type DisplayTarget = 'ALERT_FEED' | 'HEADER' | 'SCREENER';

/**
 * Resolved display information for a ticker.
 * Color is the resolved CSS color for the given target.
 * FeedState is meaningful for ALERT_FEED target, best-effort for others.
 */
export interface DisplayInfo {
  color: string;
  feedState: FeedState;
}

/**
 * Shared display-state resolver for alert feed, header, and area painting.
 * Centralizes the logic that was previously duplicated across
 * AlertFeedManager, PaintManager.paintHeader, and PaintManager.resolveSymbolColor.
 */
export interface IDisplayManager {
  /**
   * Full ticker display info resolution.
   * Fetches category, checks DOM watchlist membership, and checks recent status.
   * @param ticker Ticker symbol or null for unmapped
   * @param target Display target context
   */
  resolve(ticker: string | null, target: DisplayTarget): Promise<DisplayInfo>;

  /**
   * Color resolution for area painting using pre-computed booleans.
   * Used by batch paint paths where category and context are already resolved.
   * @param watchCat Pre-resolved watch category (undefined = no category)
   * @param isInWatchlist Whether ticker is in the DOM watchlist
   * @param isRecent Whether ticker has been recently viewed
   * @param area Painting area (WATCHLIST or SCREENER)
   */
  resolveColor(
    watchCat: WatchCategory | undefined,
    isInWatchlist: boolean,
    isRecent: boolean,
    area: TickerArea
  ): string;

  /**
   * Color resolution for header using pre-resolved watch category.
   * Avoids duplicate category fetch when caller already resolved it for flag/FNO.
   * @param ticker Ticker symbol
   * @param watchCat Pre-resolved watch category (undefined = no category)
   */
  resolveHeaderColor(ticker: string, watchCat: WatchCategory | undefined): Promise<string>;
}

/**
 * Implementation of IDisplayManager.
 * Centralizes the mapping from ticker state to display colors for
 * alert feed rows, header name, and panel ticker symbols.
 */
export class DisplayManager implements IDisplayManager {
  constructor(
    private readonly categoryManager: ICategoryManager,
    private readonly domManager: IDomManager,
    private readonly recentManager: IRecentManager
  ) {}

  /** @inheritdoc */
  async resolve(ticker: string | null, target: DisplayTarget): Promise<DisplayInfo> {
    if (ticker === null) {
      return { color: 'red', feedState: FeedState.UNMAPPED };
    }

    const { watch: watchCat } = await this.categoryManager.getTickerCategory(ticker);

    if (target === 'HEADER') {
      const color = await this.resolveHeaderColor(ticker, watchCat);
      return { color, feedState: FeedState.MAPPED };
    }

    const isInWatchlist = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL).has(ticker);
    const isRecent = await this.recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS);

    if (target === 'ALERT_FEED') {
      return this.resolveAlertFeedInfo(watchCat, isInWatchlist, isRecent);
    }

    // SCREENER target
    const color = this.resolveColor(watchCat, isInWatchlist, isRecent, TickerArea.SCREENER);
    const feedState = this.computeFeedState(watchCat, isInWatchlist, isRecent);
    return { color, feedState };
  }

  /** @inheritdoc */
  resolveColor(
    watchCat: WatchCategory | undefined,
    isInWatchlist: boolean,
    isRecent: boolean,
    area: TickerArea
  ): string {
    if (watchCat) {
      if (area !== TickerArea.SCREENER || isInWatchlist) {
        return watchCat.color;
      }
      // Screener with watchCat but ticker absent from watchlist — fall through
    }

    if (area === TickerArea.SCREENER) {
      if (isInWatchlist) {
        return Constants.UI.COLORS.HEADER_DEFAULT;
      }
      if (isRecent) {
        return Constants.UI.COLORS.SCREENER_RECENT;
      }
    }

    return Constants.UI.COLORS.DEFAULT;
  }

  /** @inheritdoc */
  async resolveHeaderColor(ticker: string, watchCat: WatchCategory | undefined): Promise<string> {
    const isInWatchlist = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL).has(ticker);
    if (watchCat && isInWatchlist) {
      return watchCat.color;
    }
    if (isInWatchlist) {
      return Constants.UI.COLORS.HEADER_DEFAULT;
    }
    return Constants.UI.COLORS.DEFAULT;
  }

  /**
   * Resolve alert feed specific display info.
   * Returns WATCHED/yellow when ticker has watch category and is in DOM watchlist,
   * RECENT/lime when recently viewed, or MAPPED/white otherwise.
   */
  private resolveAlertFeedInfo(
    watchCat: WatchCategory | undefined,
    isInWatchlist: boolean,
    isRecent: boolean
  ): DisplayInfo {
    if (watchCat && isInWatchlist) {
      return { color: 'yellow', feedState: FeedState.WATCHED };
    }
    if (isRecent) {
      return { color: 'lime', feedState: FeedState.RECENT };
    }
    return { color: 'white', feedState: FeedState.MAPPED };
  }

  /**
   * Compute FeedState from watch category, watchlist membership, and recent status.
   */
  private computeFeedState(watchCat: WatchCategory | undefined, isInWatchlist: boolean, isRecent: boolean): FeedState {
    if (watchCat && isInWatchlist) {
      return FeedState.WATCHED;
    }
    if (isRecent) {
      return FeedState.RECENT;
    }
    return FeedState.MAPPED;
  }
}
