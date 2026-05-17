import { ITickerClient } from '../client/ticker';

/**
 * Interface for FNO read operations backed by TickerClient.
 * Writes (add/remove/clear) are no longer supported — backend is source of truth.
 */
export interface IFnoManager {
  /**
   * Check if ticker is an FNO symbol (sync, from pre-loaded cache).
   * @param ticker - Ticker symbol to check
   * @returns True if ticker is in FNO cache
   */
  isFno(ticker: string): boolean;

  /**
   * Get all FNO tickers (sync, from pre-loaded cache).
   * @returns Copy of cached FNO ticker set
   */
  getAllFnoTickers(): Set<string>;
}

/**
 * Manages FNO (Futures & Options) ticker data loaded from the Kohan backend.
 * Cache is populated asynchronously on construction via TickerClient.listTickers().
 * All public methods are synchronous reads from the pre-loaded cache.
 */
export class FnoManager implements IFnoManager {
  // HACK: Do we need Cache here ?
  private readonly cache: Set<string> = new Set();

  /**
   * Creates a new FnoManager.
   * Triggers async cache load from backend on construction.
   * @param client - TickerClient for backend API calls
   */
  constructor(private readonly client: ITickerClient) {
    void this.loadCache();
  }

  /**
   * Loads FNO tickers from backend into cache.
   * Fire-and-forget — same pattern as SetRepo constructor load.
   * @private
   */
  private async loadCache(): Promise<void> {
    try {
      const resp = await this.client.listTickers({ 'is-fno': true, limit: 500 });
      for (const t of resp.tickers) {
        this.cache.add(t.ticker);
      }
    } catch {
      // Cache stays empty on failure — retry on next paint cycle
    }
  }

  /** @inheritdoc */
  public isFno(ticker: string): boolean {
    return this.cache.has(ticker);
  }

  /** @inheritdoc */
  public getAllFnoTickers(): Set<string> {
    return new Set(this.cache);
  }
}
