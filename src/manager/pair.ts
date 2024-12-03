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
  investingTickerToPairInfo(investingTicker: string): PairInfo;

  /**
   * Deletes a ticker's pair info
   * @param investingTicker Investing.com ticker
   */
  deletePairInfo(investingTicker: string): void;
}

/**
 * Manages pair information and mappings
 */
export class PairManager implements IPairManager {
  /**
   * @param pairRepo Repository for pair operations
   */
  constructor(private readonly _pairRepo: IPairRepo) {}

  /** @inheritdoc */
  getAllInvestingTickers(): string[] {
    return this._pairRepo.getAllInvestingTickers();
  }

  /** @inheritdoc */
  createInvestingToPairMapping(investingTicker: string, pairInfo: PairInfo): void {
    this._pairRepo.pinPair(investingTicker, pairInfo);
  }

  /** @inheritdoc */
  investingTickerToPairInfo(investingTicker: string): PairInfo {
    const pairInfo = this._pairRepo.getPairInfo(investingTicker);
    if (!pairInfo) {
      throw new Error(`No pair info found for ticker: ${investingTicker}`);
    }
    return pairInfo;
  }

  /** @inheritdoc */
  deletePairInfo(investingTicker: string): void {
    this._pairRepo.delete(investingTicker);
  }
}
