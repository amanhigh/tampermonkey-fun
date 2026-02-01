import { PairInfo } from '../models/alert';
import { IPairRepo } from '../repo/pair';
import { ISymbolManager } from './symbol';
import { IWatchManager } from './watch';
import { IFlagManager } from './flag';
import { IAlertFeedManager } from './alertfeed';

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
   */
  constructor(
    private readonly pairRepo: IPairRepo,
    private readonly symbolManager: ISymbolManager,
    private readonly watchManager: IWatchManager,
    private readonly flagManager: IFlagManager,
    private readonly alertFeedManager: IAlertFeedManager
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
   * Deletes pair mapping information and performs cleanup
   * @param investingTicker The investing.com ticker symbol to unmap
   * @returns True if ticker was removed from any lists, false otherwise
   */
  deletePairInfo(investingTicker: string): boolean {
    const tvTicker = this.symbolManager.investingToTv(investingTicker);

    // 1. Delete pair mapping (existing functionality)
    this.pairRepo.delete(investingTicker);

    // 2. Remove symbol mapping (moved from handler)
    this.symbolManager.removeTvToInvestingMapping(investingTicker);

    // 3. Cleanup watchlist, flags if present
    let cleanedFromLists = false;

    if (tvTicker) {
      // FIXME: UI Must be repainted based on changes
      const watchlistRemoved = this.cleanupWatchlist(tvTicker);
      const flagsRemoved = this.cleanupFlags(tvTicker);
      cleanedFromLists = watchlistRemoved || flagsRemoved;
    }

    // 4. Update alert feed (moved from handler, fire-and-forget)
    if (tvTicker) {
      void this.alertFeedManager.createAlertFeedEvent(tvTicker);
    }

    return cleanedFromLists;
  }

  /**
   * Removes ticker from all watchlist categories
   * @private
   * @param tvTicker TradingView ticker to remove
   * @returns True if ticker was removed, false otherwise
   */
  private cleanupWatchlist(tvTicker: string): boolean {
    // Use manager interface - evict ticker from all watchlist categories
    return this.watchManager.evictTicker(tvTicker);
  }

  /**
   * Removes ticker from all flag categories
   * @private
   * @param tvTicker TradingView ticker to remove
   * @returns True if ticker was removed, false otherwise
   */
  private cleanupFlags(tvTicker: string): boolean {
    // Use manager interface - evict ticker from all flag categories
    return this.flagManager.evictTicker(tvTicker);
  }
}
