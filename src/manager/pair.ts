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
import { Notifier } from '../util/notify';

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
   * Stops tracking an investing ticker — full cascade cleanup
   * @param investingTicker Investing.com ticker
   * @returns True if ticker was removed from any lists, false otherwise
   */
  stopTrackingByInvestingTicker(investingTicker: string): boolean;

  /**
   * Stops tracking a TV ticker — resolves to investing ticker and performs full cascade cleanup
   * @param tvTicker TradingView ticker
   * @returns True if ticker was removed from any lists, false otherwise
   */
  stopTrackingByTvTicker(tvTicker: string): boolean;

  /**
   * Removes a duplicate investing ticker alias — deletes only its pairRepo entry.
   * All other stores (tickerRepo, watchlist, flags, recent, sequence, exchange, alerts)
   * remain untouched so the canonical ticker has zero data impact.
   * @param investingTicker The alias investing ticker to remove from pairRepo
   */
  removePairByInvestingTicker(investingTicker: string): void;

  /**
   * Validates guard rails before creating a pair mapping.
   * Checks for duplicate pairId and conflicting tvTicker alias.
   * @param selectedPair The pair info to validate
   * @param tvTicker The current tvTicker being mapped
   * @returns True if mapping should proceed, false if blocked
   */
  checkGuardRails(selectedPair: PairInfo, tvTicker: string): boolean;
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
   // eslint-disable-next-line max-params
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
   * Stops tracking an investing ticker — full cascade cleanup
   * @param investingTicker The investing.com ticker symbol to stop tracking
   * @returns True if ticker was removed from any lists, false otherwise
   */
  stopTrackingByInvestingTicker(investingTicker: string): boolean {
    // 1. Get TV ticker before removing mappings
    const tvTicker = this.symbolManager.investingToTv(investingTicker);

    // 2. Read pair info BEFORE delete (needed for alert cleanup)
    const pairInfo = this.pairRepo.getPairInfo(investingTicker);

    // 3. Delete pair mapping
    this.pairRepo.delete(investingTicker);

    // 4. Remove symbol mappings for this investing ticker
    this.symbolManager.removeTvToInvestingMapping(investingTicker);

    // 5. Cleanup tvTicker-keyed stores
    let cleanedFromLists = false;
    if (tvTicker) {
      cleanedFromLists = this.cleanupTvTickerStores(tvTicker);
    }

    // 6. Delete Investing.com alerts for this pair (fire-and-forget)
    if (pairInfo) {
      const alerts = this.alertRepo.get(pairInfo.pairId);
      if (alerts && alerts.length > 0) {
        void Promise.all(alerts.map(async (alert) => this.investingClient.deleteAlert(alert)));
        this.alertRepo.delete(pairInfo.pairId);
      }
    }

    return cleanedFromLists;
  }

  /**
   * Stops tracking a TV ticker — resolves to investing ticker and performs full cascade cleanup
   * @param tvTicker TradingView ticker to stop tracking
   * @returns True if ticker was removed from any lists, false otherwise
   */
  stopTrackingByTvTicker(tvTicker: string): boolean {
    const investingTicker = this.symbolManager.tvToInvesting(tvTicker);

    // If investing mapping exists, delegate to full cleanup
    if (investingTicker) {
      return this.stopTrackingByInvestingTicker(investingTicker);
    }

    // No investing mapping — still clean up tvTicker-keyed stores
    return this.cleanupTvTickerStores(tvTicker);
  }

  /** @inheritdoc */
  removePairByInvestingTicker(investingTicker: string): void {
    this.pairRepo.delete(investingTicker);
  }

  /** @inheritdoc */
  checkGuardRails(selectedPair: PairInfo, tvTicker: string): boolean {
    // Guard rail 14.1: Check if another investingTicker already has this pairId
    const existingTickers = this.pairRepo.findByPairId(selectedPair.pairId);
    const otherTickers = existingTickers.filter((t) => t !== selectedPair.symbol);
    if (otherTickers.length > 0) {
      const msg = `PairId ${selectedPair.pairId} already mapped to ${otherTickers.join(', ')} (Investing.com). Replace stale entry with ${selectedPair.symbol} (Investing.com)?`;
      if (!confirm(msg)) {
        Notifier.warn(`Mapping blocked: pairId ${selectedPair.pairId} shared by ${otherTickers.join(', ')}`);
        return false;
      }
      otherTickers.forEach((t) => this.pairRepo.delete(t));
      Notifier.info(`Replaced stale entry: ${otherTickers.join(', ')}`);
    }

    // Guard rail 14.2: Check if this investingTicker is already mapped from another tvTicker
    const existingTvTicker = this.symbolManager.investingToTv(selectedPair.symbol);
    if (existingTvTicker && existingTvTicker !== tvTicker) {
      const msg = `${selectedPair.symbol} (Investing.com) is already mapped to ${existingTvTicker} (TradingView). Replace with ${tvTicker} (TradingView)?`;
      if (!confirm(msg)) {
        Notifier.warn(`Mapping blocked: ${selectedPair.symbol} already mapped from ${existingTvTicker}`);
        return false;
      }
      this.symbolManager.deleteTvTicker(existingTvTicker);
      Notifier.info(`Replaced stale tvTicker alias: ${existingTvTicker}`);
    }

    return true;
  }

  /**
   * Cleans up all tvTicker-keyed stores (watchlist, flags, alertfeed, recent, sequence, exchange)
   * @param tvTicker TradingView ticker to clean up
   * @returns True if ticker was removed from any lists, false otherwise
   */
  private cleanupTvTickerStores(tvTicker: string): boolean {
    const watchlistRemoved = this.watchManager.evictTicker(tvTicker);
    const flagsRemoved = this.flagManager.evictTicker(tvTicker);

    void this.alertFeedManager.createAlertFeedEvent(tvTicker);
    this.recentRepo.delete(tvTicker);
    this.sequenceRepo.delete(tvTicker);
    this.exchangeRepo.delete(tvTicker);

    return watchlistRemoved || flagsRemoved;
  }
}
