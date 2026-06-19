import { DisplayState, DisplayInfo } from '../models/display';
import { Constants } from '../models/constant';
import { Color } from '../models/color';
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
 *   1 ticker=null                                   → UNMAPPED / purple
 *   2 watch category + in watchlist silo            → WATCH_CATEGORY / category color
 *   3 silo populated, ticker not in silo (untracked) → UNMAPPED / purple
 *   4 recent                                        → RECENT / gold
 *   5 fallback                                      → DEFAULT / white
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
      return { state: DisplayState.UNMAPPED, color: Color.PURPLE };
    }

    const [category, siloTickers] = await Promise.all([
      this.categoryManager.getTickerCategory(ticker),
      this.getWatchlistSilo(),
    ]);

    // Priority 2: Watch category + in silo
    if (category.watch && siloTickers.has(ticker)) {
      return { state: DisplayState.WATCH_CATEGORY, color: category.watch.color };
    }

    // Priority 3: Silo populated but ticker absent → untracked
    if (siloTickers.size > 0 && !siloTickers.has(ticker)) {
      return { state: DisplayState.UNMAPPED, color: Color.PURPLE };
    }

    // Priority 4: Recent
    if (await this.recentManager.isRecent(ticker, Constants.RECENT_CUTOFF_MS)) {
      return { state: DisplayState.RECENT, color: 'gold' };
    }

    // Priority 5: Default
    return { state: DisplayState.DEFAULT, color: Constants.UI.COLORS.DEFAULT };
  }

  /**
   * Read the shared watchlist ticker set from GM storage.
   * Returns empty set when silo has not been loaded yet, so callers
   * can distinguish "no data" (size=0) from "loaded but ticker absent".
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
