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

  /**
   * Find all investing tickers that share a given pairId
   * @param pairId The pairId to search for
   * @returns Array of investing tickers with this pairId
   */
  findByPairId(pairId: string): string[];
}

/**
 * Repository for managing pair mappings
 * Maps Investing.com tickers to their pair information
 *
 * WHY tvTicker → investingTicker → PairInfo ARCHITECTURE:
 * =====================================================
 *
 * 🔗 EXTERNAL API: Investing.com API returns investing ticker keyed data
 * 📊 BATCH OPS: Audit system processes all pairs by investing ticker
 * 🌐 EXTERNAL FEEDS: Alert events from Investing.com use investing tickers
 * 💾 DATA STORAGE: Repository keyed by investing ticker for persistence
 * 🔄 FLEXIBILITY: Supports multiple TV ticker aliases per investing ticker
 *
 * ❌ DIRECT tvTicker → PairInfo BREAKS:
 * - AuditManager batch processing
 * - AlertFeedHandler external parsing
 * - InvestingClient API responses
 * - PairRepo data persistence
 *
 * ✅ KEEP CURRENT: Optimize performance, not architecture
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
      const pairData = info as { name: string; pairId: string; exchange: string; symbol: string };
      pairMap.set(ticker, new PairInfo(pairData.name, pairData.pairId, pairData.exchange, pairData.symbol));
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
    this.set(investingTicker, pairInfo);
  }

  /**
   * @inheritdoc
   */
  public findByPairId(pairId: string): string[] {
    const results: string[] = [];
    this.map.forEach((info, ticker) => {
      if (info.pairId === pairId) {
        results.push(ticker);
      }
    });
    return results;
  }
}
