import { PairInfo } from '../models/alert';
import { IPairRepo } from '../repo/pair';

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
   */
  deletePairInfo(investingTicker: string): void;
}

// TODO: #A Plan Manager Test Coverage.

/**
 * Manages pair information and mappings
 */
export class PairManager implements IPairManager {
  /**
   * @param pairRepo Repository for pair operations
   */
  constructor(private readonly pairRepo: IPairRepo) {}

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

  /** @inheritdoc */
  deletePairInfo(investingTicker: string): void {
    this.pairRepo.delete(investingTicker);
  }
}
