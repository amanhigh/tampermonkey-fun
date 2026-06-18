import { DisplayState, DisplayInfo } from '../models/display';
import { Constants } from '../models/constant';
import { ICategoryManager } from './category';
import { IRecentManager } from './recent';

/**
 * Display-state resolver for header name and alert feed.
 * Watchlist/screener symbol colors are resolved directly by PaintManager.
 *
 * Watchlist membership is determined from a shared GM silo
 * (Constants.STORAGE.SILOS.WATCHLIST) that the TradingView watchlist
 * manager keeps updated — this makes DisplayManager work correctly on
 * both TradingView and Investing pages.
 *
 * Priority order (surface-independent):
 *   1 ticker=null (unmapped)                 → UNMAPPED / purple
 *   2 watch category + in watchlist silo     → WATCH_CATEGORY / category color
 *   3 recent                                 → RECENT / gold
 *   4 everything else                        → DEFAULT / white
 */
export interface IDisplayManager {
  /** Resolve display info for a ticker using the shared priority rules. */
  resolve(ticker: string | null): Promise<DisplayInfo>;
}

/**
 * Implementation of IDisplayManager.
 */
export class DisplayManager implements IDisplayManager {
  constructor(
    private readonly categoryManager: ICategoryManager,
    private readonly recentManager: IRecentManager
  ) {}

  /** @inheritdoc */
  async resolve(ticker: string | null): Promise<DisplayInfo> {
    // Priority 1: Unmapped
    if (ticker === null) {
      return { state: DisplayState.UNMAPPED, color: 'purple' };
    }

    // Fetch watch category and watchlist silo in parallel
    const [category, watchlistTickers] = await Promise.all([
      this.categoryManager.getTickerCategory(ticker),
      this.getWatchlistSilo(),
    ]);
    const watchCat = category.watch;

    // Priority 2: Watch category + in watchlist silo
    if (watchCat && watchlistTickers.has(ticker)) {
      return { state: DisplayState.WATCH_CATEGORY, color: watchCat.color };
    }

    // Priority 3: Recent
    const isRecent = await this.recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS);
    if (isRecent) {
      return { state: DisplayState.RECENT, color: 'gold' };
    }

    // Priority 4: Default
    return { state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT };
  }

  /**
   * Read the shared watchlist ticker set from GM storage.
   * Written by TradingViewWatchlistManager.refresh() on the TradingView page.
   * Falls back to empty set when no snapshot exists (first run, or no watchlist data yet).
   */
  private async getWatchlistSilo(): Promise<Set<string>> {
    const raw = await GM.getValue(Constants.STORAGE.SILOS.WATCHLIST);

    if (!raw) {
      return new Set();
    }

    const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { tickers?: string[] };
    return new Set(parsed.tickers ?? []);
  }
}
