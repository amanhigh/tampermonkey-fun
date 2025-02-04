import { IRepoCron } from './cron';
import { MapRepo, IMapRepo } from './map';
import { PairInfo } from '../models/alert';
import { SerializedData } from './base';

/**
 * Interface for pair repository operations
 */
export interface IPairRepo extends IMapRepo<string, PairInfo> {
  /**
   * Get pair info for given investing ticker
   * @param investingTicker Investing.com ticker
   * @returns Pair info if mapped, null otherwise
   */
  getPairInfo(investingTicker: string): PairInfo | null;

  /**
   * Get all mapped investing tickers
   * @returns Array of investing tickers
   */
  getAllInvestingTickers(): string[];

  /**
   * Pin pair information for investing ticker
   * @param investingTicker Investing.com ticker
   * @param pairInfo Pair information
   */
  pinPair(investingTicker: string, pairInfo: PairInfo): void;
}

/**
 * Repository for managing pair mappings
 * Maps Investing.com tickers to their pair information
 */
export class PairRepo extends MapRepo<string, PairInfo> implements IPairRepo {
  /**
   * Creates a new pair repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'pairRepo');
  }

  /**
   * @inheritdoc
   */
  protected deserialize(data: SerializedData): Map<string, PairInfo> {
    const pairMap = new Map<string, PairInfo>();
    Object.entries(data).forEach(([ticker, info]) => {
      const pairData = info as { name: string; pairId: string; exchange: string };
      pairMap.set(ticker, new PairInfo(pairData.name, pairData.pairId, pairData.exchange));
    });
    return pairMap;
  }

  /**
   * @inheritdoc
   */
  protected _serialize(): SerializedData {
    const data: SerializedData = {};
    this.map.forEach((pairInfo, ticker) => {
      data[ticker] = {
        name: pairInfo.name,
        pairId: pairInfo.pairId,
        exchange: pairInfo.exchange,
      };
    });
    return data;
  }

  /**
   * @inheritdoc
   */
  public getPairInfo(investingTicker: string): PairInfo | null {
    return this.get(investingTicker) || null;
  }

  /**
   * @inheritdoc
   */
  public getAllInvestingTickers(): string[] {
    return this.getAllKeys();
  }

  /**
   * @inheritdoc
   */
  public pinPair(investingTicker: string, pairInfo: PairInfo): void {
    this.set(investingTicker, new PairInfo(pairInfo.name, pairInfo.pairId, pairInfo.exchange));
  }
}
