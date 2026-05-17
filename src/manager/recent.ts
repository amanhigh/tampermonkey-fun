import { ITickerClient } from '../client/ticker';

/**
 * Options for isRecent lookup
 */
export interface IsRecentOptions {
  /**
   * If set, ticker is only considered recent if its last-opened
   * timestamp is more recent than this epoch-ms threshold.
   */
  sinceMs?: number;
}

/**
 * Interface for managing recent ticker data operations.
 * Backed by TickerClient — reads/writes TickerRecord.last_opened_at.
 */
export interface IRecentManager {
  /**
   * Record ticker as recently opened. Updates cache + backend.
   * @param tvTicker Ticker to record
   */
  markRecent(tvTicker: string): void;

  /**
   * Check if ticker exists in recent list (sync, from cache).
   * @param tvTicker Ticker to check
   * @param options Optional filter (e.g. sinceMs for stale cutoff)
   */
  isRecent(tvTicker: string, options?: IsRecentOptions): boolean;
}

/**
 * Manages recent ticker data loaded from the Kohan backend.
 * Cache populated asynchronously on construction via listAllTickers().
 * Writes update cache immediately + fire async to backend.
 */
export class RecentManager implements IRecentManager {
  private readonly cache: Map<string, number> = new Map();

  /**
   * Creates a new RecentManager.
   * Triggers async cache load from backend on construction.
   * @param client - TickerClient for backend API calls
   */
  constructor(private readonly client: ITickerClient) {
    void this.loadCache();
  }

  /**
   * Loads recent ticker data from backend into cache.
   * Converts backend RFC3339 timestamps to epoch ms.
   * @private
   */
  private async loadCache(): Promise<void> {
    try {
      const tickers = await this.client.listAllTickers({
        'sort-by': 'last_opened_at',
        'sort-order': 'desc',
      });
      for (const t of tickers) {
        if (t.last_opened_at) {
          this.cache.set(t.ticker, new Date(t.last_opened_at).getTime());
        }
      }
    } catch {
      // Cache stays empty on failure — retry on next ticker open
    }
  }

  /** @inheritdoc */
  public markRecent(tvTicker: string): void {
    const now = Date.now();
    this.cache.set(tvTicker, now);
    void this.client
      .patchTickerLastOpened(tvTicker, {
        last_opened_at: new Date(now).toISOString(),
      })
      .catch(() => {
        // Silently fail — cache still has the latest timestamp
      });
  }

  /** @inheritdoc */
  public isRecent(tvTicker: string, options?: IsRecentOptions): boolean {
    const timestamp = this.cache.get(tvTicker);
    if (timestamp === undefined) {
      return false;
    }
    if (options?.sinceMs !== undefined) {
      return timestamp > options.sinceMs;
    }
    return true;
  }
}
