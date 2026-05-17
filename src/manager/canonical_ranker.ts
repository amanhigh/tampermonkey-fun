import { IAlertRepo } from '../repo/alert';
import { IWatchManager } from './watch';
import { IRecentManager } from './recent';
import { ITickerClient } from '../client/ticker';
import { IPairRepo } from '../repo/pair';
import { ISymbolManager } from './symbol';
import { Constants } from '../models/constant';

/**
 * Signal scores used to rank a ticker for canonical selection
 */
export interface TickerSignals {
  ticker: string;
  alertCount: number;
  isWatched: boolean;
  isRecent: boolean;
  hasExchange: boolean;
  hasPairMapping: boolean;
  score: number;
}

/**
 * Interface for ranking tickers to determine canonical entry
 */
export interface ICanonicalRanker {
  /**
   * Rank investingTickers sharing a pairId and return sorted by score descending.
   * First element is the canonical (highest score).
   * @param investingTickers Investing tickers to rank
   * @param pairId The shared pairId
   * @returns Promise resolving to sorted TickerSignals array (highest score first)
   */
  rankInvestingTickers(investingTickers: string[], pairId: string): Promise<TickerSignals[]>;

  /**
   * Rank tvTickers sharing an investingTicker and return sorted by score descending.
   * First element is the canonical (highest score).
   * @param tvTickers TV tickers to rank
   * @returns Promise resolving to sorted TickerSignals array (highest score first)
   */
  rankTvTickers(tvTickers: string[]): Promise<TickerSignals[]>;
}

/**
 * Dependencies for CanonicalRanker
 */
export interface CanonicalRankerDeps {
  alertRepo: IAlertRepo;
  watchManager: IWatchManager;
  recentManager: IRecentManager;
  tickerClient: ITickerClient;
  pairRepo: IPairRepo;
  symbolManager: ISymbolManager;
}

/**
 * Ranks tickers using live signals to determine canonical entry for deduplication.
 *
 * Signal priority (descending weight):
 * 1. Alert count (×100) — tickers with alerts are most valuable
 * 2. Watchlist membership (×50) — actively monitored tickers
 * 3. Recent open timestamp (×10 if present) — recently viewed
 * 4. Exchange footprints (×5) — has stored exchange
 * 5. Pair mapping presence (×1) — has investing mapping
 * 6. HTML-encoding penalty (−500) — junk aliases like M&amp;M or M&amp;AMP;M
 * 7. Preferred exchange bonus (+15) — NSE/NYSE/NASDAQ/CBOE from backend ticker.exchange
 * 8. Ampersand fallback (+2) — raw & in ticker hints NSE origin when no exchange data
 * 9. Tiebreaker: shorter ticker name wins (e.g. M&M over M_M)
 */
export class CanonicalRanker implements ICanonicalRanker {
  private static readonly WEIGHT_ALERTS = 100;
  private static readonly WEIGHT_WATCHED = 50;
  private static readonly WEIGHT_RECENT = 10;
  private static readonly WEIGHT_EXCHANGE = 5;
  private static readonly WEIGHT_PAIR = 1;
  private static readonly PENALTY_HTML_ENCODED = -500;
  private static readonly BONUS_PREFERRED_EXCHANGE = 15;
  private static readonly BONUS_AMPERSAND = 2;

  private readonly alertRepo: IAlertRepo;
  private readonly watchManager: IWatchManager;
  private readonly recentManager: IRecentManager;
  private readonly tickerClient: ITickerClient;
  private readonly pairRepo: IPairRepo;
  private readonly symbolManager: ISymbolManager;

  constructor(deps: CanonicalRankerDeps) {
    this.alertRepo = deps.alertRepo;
    this.watchManager = deps.watchManager;
    this.recentManager = deps.recentManager;
    this.tickerClient = deps.tickerClient;
    this.pairRepo = deps.pairRepo;
    this.symbolManager = deps.symbolManager;
  }

  /** @inheritdoc */
  async rankInvestingTickers(investingTickers: string[], pairId: string): Promise<TickerSignals[]> {
    const signals = await Promise.all(
      investingTickers.map(async (investingTicker) => {
        const tvTicker = this.symbolManager.investingToTv(investingTicker);
        const alertCount = this.getAlertCount(pairId);
        const isWatched = tvTicker ? this.watchManager.isWatched(tvTicker) : false;
        const isRecent = tvTicker ? this.recentManager.isRecent(tvTicker, Constants.RECENT_CUTOFF_MS) : false;
        const hasExchange = tvTicker ? await this.hasExchange(tvTicker) : false;
        const hasPairMapping = tvTicker !== null;

        return this.buildSignals({
          ticker: investingTicker,
          alertCount,
          isWatched,
          isRecent,
          hasExchange,
          hasPairMapping,
        });
      })
    );

    return signals.sort((a, b) => b.score - a.score);
  }

  /** @inheritdoc */
  async rankTvTickers(tvTickers: string[]): Promise<TickerSignals[]> {
    const signals = await Promise.all(
      tvTickers.map(async (tvTicker) => {
        const investingTicker = this.symbolManager.tvToInvesting(tvTicker);
        const pairInfo = investingTicker ? this.pairRepo.getPairInfo(investingTicker) : null;
        const pairId = pairInfo?.pairId;
        const alertCount = pairId ? this.getAlertCount(pairId) : 0;
        const isWatched = this.watchManager.isWatched(tvTicker);
        const isRecent = this.recentManager.isRecent(tvTicker, Constants.RECENT_CUTOFF_MS);
        const hasExchange = await this.hasExchange(tvTicker);
        const hasPairMapping = investingTicker !== null;

        return this.buildSignals({
          ticker: tvTicker,
          alertCount,
          isWatched,
          isRecent,
          hasExchange,
          hasPairMapping,
        });
      })
    );

    return signals.sort((a, b) => b.score - a.score || a.ticker.length - b.ticker.length);
  }

  /**
   * Check if a ticker has an exchange stored in backend.
   * @private
   */
  private async hasExchange(tvTicker: string): Promise<boolean> {
    try {
      const record = await this.tickerClient.getTicker(tvTicker);
      return record.exchange !== null && record.exchange !== undefined;
    } catch {
      return false;
    }
  }

  private getAlertCount(pairId: string): number {
    const alerts = this.alertRepo.get(pairId);
    return alerts ? alerts.length : 0;
  }

  private isHtmlEncoded(ticker: string): boolean {
    return ticker.includes('&amp;') || ticker.includes('&AMP;');
  }

  private hasRawAmpersand(ticker: string): boolean {
    return ticker.includes('&') && !this.isHtmlEncoded(ticker);
  }

  /**
   * Check if backend ticker exchange is a preferred exchange.
   * @private
   */
  private async isPreferredExchange(ticker: string): Promise<boolean> {
    try {
      const record = await this.tickerClient.getTicker(ticker);
      if (!record.exchange) {
        return false;
      }
      return Constants.EXCHANGE.PREFERRED.includes(record.exchange);
    } catch {
      return false;
    }
  }

  private async buildSignals(signals: Omit<TickerSignals, 'score'>): Promise<TickerSignals> {
    const score =
      signals.alertCount * CanonicalRanker.WEIGHT_ALERTS +
      (signals.isWatched ? CanonicalRanker.WEIGHT_WATCHED : 0) +
      (signals.isRecent ? CanonicalRanker.WEIGHT_RECENT : 0) +
      (signals.hasExchange ? CanonicalRanker.WEIGHT_EXCHANGE : 0) +
      (signals.hasPairMapping ? CanonicalRanker.WEIGHT_PAIR : 0) +
      (this.isHtmlEncoded(signals.ticker) ? CanonicalRanker.PENALTY_HTML_ENCODED : 0) +
      ((await this.isPreferredExchange(signals.ticker)) ? CanonicalRanker.BONUS_PREFERRED_EXCHANGE : 0) +
      (this.hasRawAmpersand(signals.ticker) ? CanonicalRanker.BONUS_AMPERSAND : 0);

    return { ...signals, score };
  }
}
