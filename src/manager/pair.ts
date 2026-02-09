import { PairInfo } from '../models/alert';
import { IPairRepo } from '../repo/pair';
import { ISymbolManager } from './symbol';
import { IWatchManager } from './watch';
import { IFlagManager } from './flag';
import { IAlertFeedManager } from './alertfeed';
import { IRecentTickerRepo } from '../repo/recent';
import { ISequenceRepo } from '../repo/sequence';
import { IExchangeRepo } from '../repo/exchange';
import { IAlertRepo } from '../repo/alert';
import { IInvestingClient } from '../client/investing';

/**
 * Interface for managing pair information and mappings
 */
export interface IPairManager {
  /**
   * Get all investing tickers that have been mapped for Alerts.
   * @returns Array of investing tickers
   */
  getAllInvestingTickers(): string[];

  /**
   * Map investing ticker to alert pair.
   * @param investingTicker Investing.com ticker
   * @param pairInfo Pair information
   */
  createInvestingToPairMapping(investingTicker: string, pairInfo: PairInfo): void;

  /**
   * Map investing pair info from the cache
   * @param investingTicker Investing.com ticker
   * @returns The cached pair data or null if not found
   */
  investingTickerToPairInfo(investingTicker: string): PairInfo | null;

  /**
   * Deletes a ticker's pair info
   * @param investingTicker Investing.com ticker
   * @returns True if ticker was removed from any lists, false otherwise
   */
  deletePairInfo(investingTicker: string): boolean;
}

/**
 * Manages pair information and mappings
 */
export class PairManager implements IPairManager {
  /**
   * @param pairRepo Repository for pair operations
   * @param symbolManager Manager for symbol mappings
   * @param watchManager Manager for watchlist operations
   * @param flagManager Manager for flag operations
   * @param alertFeedManager Manager for alert feed operations
   * @param recentRepo Repository for recent ticker operations
   * @param sequenceRepo Repository for sequence operations
   * @param exchangeRepo Repository for exchange operations
   * @param alertRepo Repository for alert operations
   * @param investingClient Client for Investing.com alert deletion
   */
  constructor(
    private readonly pairRepo: IPairRepo,
    private readonly symbolManager: ISymbolManager,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly alertFeedManager: IAlertFeedManager,
    private readonly recentRepo: IRecentTickerRepo,
    private readonly sequenceRepo: ISequenceRepo,
    private readonly exchangeRepo: IExchangeRepo,
    private readonly alertRepo: IAlertRepo,
    private readonly investingClient: IInvestingClient
  ) {}

  /** @inheritdoc */
  getAllInvestingTickers(): string[] {
    return this.pairRepo.getAllInvestingTickers();
  }

  /** @inheritdoc */
  createInvestingToPairMapping(investingTicker: string, pairInfo: PairInfo): void {
    this.pairRepo.pinPair(investingTicker, pairInfo);
  }

  /** @inheritdoc */
  investingTickerToPairInfo(investingTicker: string): PairInfo | null {
    return this.pairRepo.getPairInfo(investingTicker);
  }

  /**
   * Deletes pair mapping information and performs full cascade cleanup
   * @param investingTicker The investing.com ticker symbol to unmap
   * @returns True if ticker was removed from any lists, false otherwise
   */
  deletePairInfo(investingTicker: string): boolean {
    const tvTicker = this.symbolManager.investingToTv(investingTicker);

    // 1. Delete pair mapping
    this.pairRepo.delete(investingTicker);

    // 2. Remove symbol mapping
    this.symbolManager.removeTvToInvestingMapping(investingTicker);

    // 3. Cleanup watchlist, flags if present
    let cleanedFromLists = false;

    if (tvTicker) {
      const watchlistRemoved = this.watchManager.evictTicker(tvTicker);
      const flagsRemoved = this.flagManager.evictTicker(tvTicker);
      cleanedFromLists = watchlistRemoved || flagsRemoved;
    }

    // 4. Update alert feed (fire-and-forget)
    if (tvTicker) {
      void this.alertFeedManager.createAlertFeedEvent(tvTicker);
    }

    // 5. Remove from recent tickers
    if (tvTicker) {
      this.recentRepo.delete(tvTicker);
    }

    // 6. Remove sequence preferences
    if (tvTicker) {
      this.sequenceRepo.delete(tvTicker);
    }

    // 7. Remove exchange mapping
    if (tvTicker) {
      this.exchangeRepo.delete(tvTicker);
    }

    // 8. Delete Investing.com alerts for this pair (fire-and-forget)
    const pairInfo = this.pairRepo.get(investingTicker);
    if (pairInfo) {
      const alerts = this.alertRepo.get(pairInfo.pairId);
      if (alerts && alerts.length > 0) {
        void Promise.all(alerts.map(async (alert) => this.investingClient.deleteAlert(alert)));
        this.alertRepo.delete(pairInfo.pairId);
      }
    }

    return cleanedFromLists;
  }
}
