import { IAlertRepo } from '../repo/alert';
import { IWatchManager } from './watch';
import { IRecentTickerRepo } from '../repo/recent';
import { ISequenceRepo } from '../repo/sequence';
import { IExchangeRepo } from '../repo/exchange';
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
  recentTimestamp: number;
  hasSequence: boolean;
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
   * @returns Sorted TickerSignals array (highest score first)
   */
  rankInvestingTickers(investingTickers: string[], pairId: string): TickerSignals[];

  /**
   * Rank tvTickers sharing an investingTicker and return sorted by score descending.
   * First element is the canonical (highest score).
   * @param tvTickers TV tickers to rank
   * @returns Sorted TickerSignals array (highest score first)
   */
  rankTvTickers(tvTickers: string[]): TickerSignals[];
}

/**
 * Dependencies for CanonicalRanker
 */
export interface CanonicalRankerDeps {
  alertRepo: IAlertRepo;
  watchManager: IWatchManager;
  recentRepo: IRecentTickerRepo;
  sequenceRepo: ISequenceRepo;
  exchangeRepo: IExchangeRepo;
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
 * 4. Sequence/exchange footprints (×5 each) — has stored preferences
 * 5. Pair mapping presence (×1) — has investing mapping
 * 6. HTML-encoding penalty (−500) — junk aliases like M&amp;M or M&amp;AMP;M
 * 7. Preferred exchange bonus (+15) — NSE/NYSE/NASDAQ/CBOE from exchangeRepo
 * 8. Ampersand fallback (+2) — raw & in ticker hints NSE origin when no exchange data
 * 9. Tiebreaker: shorter ticker name wins (e.g. M&M over M_M)
 */
export class CanonicalRanker implements ICanonicalRanker {
  private static readonly WEIGHT_ALERTS = 100;
  private static readonly WEIGHT_WATCHED = 50;
  private static readonly WEIGHT_RECENT = 10;
  private static readonly WEIGHT_SEQUENCE = 5;
  private static readonly WEIGHT_EXCHANGE = 5;
  private static readonly WEIGHT_PAIR = 1;
  private static readonly PENALTY_HTML_ENCODED = -500;
  private static readonly BONUS_PREFERRED_EXCHANGE = 15;
  private static readonly BONUS_AMPERSAND = 2;

  private readonly alertRepo: IAlertRepo;
  private readonly watchManager: IWatchManager;
  private readonly recentRepo: IRecentTickerRepo;
  private readonly sequenceRepo: ISequenceRepo;
  private readonly exchangeRepo: IExchangeRepo;
  private readonly pairRepo: IPairRepo;
  private readonly symbolManager: ISymbolManager;

  constructor(deps: CanonicalRankerDeps) {
    this.alertRepo = deps.alertRepo;
    this.watchManager = deps.watchManager;
    this.recentRepo = deps.recentRepo;
    this.sequenceRepo = deps.sequenceRepo;
    this.exchangeRepo = deps.exchangeRepo;
    this.pairRepo = deps.pairRepo;
    this.symbolManager = deps.symbolManager;
  }

  /** @inheritdoc */
  rankInvestingTickers(investingTickers: string[], pairId: string): TickerSignals[] {
    const signals = investingTickers.map((investingTicker) => {
      const tvTicker = this.symbolManager.investingToTv(investingTicker);
      const alertCount = this.getAlertCount(pairId);
      const isWatched = tvTicker ? this.watchManager.isWatched(tvTicker) : false;
      const recentTimestamp = tvTicker ? (this.recentRepo.get(tvTicker) ?? 0) : 0;
      const hasSequence = tvTicker ? this.sequenceRepo.has(tvTicker) : false;
      const hasExchange = tvTicker ? this.exchangeRepo.has(tvTicker) : false;
      const hasPairMapping = tvTicker !== null;

      return this.buildSignals({
        ticker: investingTicker,
        alertCount,
        isWatched,
        recentTimestamp,
        hasSequence,
        hasExchange,
        hasPairMapping,
      });
    });

    return signals.sort((a, b) => b.score - a.score);
  }

  /** @inheritdoc */
  rankTvTickers(tvTickers: string[]): TickerSignals[] {
    const signals = tvTickers.map((tvTicker) => {
      const investingTicker = this.symbolManager.tvToInvesting(tvTicker);
      const pairInfo = investingTicker ? this.pairRepo.getPairInfo(investingTicker) : null;
      const pairId = pairInfo?.pairId;
      const alertCount = pairId ? this.getAlertCount(pairId) : 0;
      const isWatched = this.watchManager.isWatched(tvTicker);
      const recentTimestamp = this.recentRepo.get(tvTicker) ?? 0;
      const hasSequence = this.sequenceRepo.has(tvTicker);
      const hasExchange = this.exchangeRepo.has(tvTicker);
      const hasPairMapping = investingTicker !== null;

      return this.buildSignals({
        ticker: tvTicker,
        alertCount,
        isWatched,
        recentTimestamp,
        hasSequence,
        hasExchange,
        hasPairMapping,
      });
    });

    return signals.sort((a, b) => b.score - a.score || a.ticker.length - b.ticker.length);
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

  private isPreferredExchange(ticker: string): boolean {
    const exchangeTicker = this.exchangeRepo.get(ticker);
    if (!exchangeTicker) {
      return false;
    }
    const exchange = exchangeTicker.split(':')[0];
    return Constants.EXCHANGE.PREFERRED.includes(exchange);
  }

  private buildSignals(signals: Omit<TickerSignals, 'score'>): TickerSignals {
    const score =
      signals.alertCount * CanonicalRanker.WEIGHT_ALERTS +
      (signals.isWatched ? CanonicalRanker.WEIGHT_WATCHED : 0) +
      (signals.recentTimestamp > 0 ? CanonicalRanker.WEIGHT_RECENT : 0) +
      (signals.hasSequence ? CanonicalRanker.WEIGHT_SEQUENCE : 0) +
      (signals.hasExchange ? CanonicalRanker.WEIGHT_EXCHANGE : 0) +
      (signals.hasPairMapping ? CanonicalRanker.WEIGHT_PAIR : 0) +
      (this.isHtmlEncoded(signals.ticker) ? CanonicalRanker.PENALTY_HTML_ENCODED : 0) +
      (this.isPreferredExchange(signals.ticker) ? CanonicalRanker.BONUS_PREFERRED_EXCHANGE : 0) +
      (this.hasRawAmpersand(signals.ticker) ? CanonicalRanker.BONUS_AMPERSAND : 0);

    return { ...signals, score };
  }
}
