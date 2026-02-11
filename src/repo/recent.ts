import { IRepoCron } from './cron';
import { MapRepo, IMapRepo } from './map';

/**
 * Interface for recent ticker repository operations
 * Stores tvTicker -> timestamp (epoch ms) for tracking when tickers were last opened
 */
export interface IRecentTickerRepo extends IMapRepo<string, number> {
  /**
   * Get all recent ticker keys as a Set (for paint compatibility)
   * @returns Set of tvTicker strings
   */
  getAllTickersAsSet(): Set<string>;
}

/**
 * Repository for managing recently viewed tickers with timestamps
 * Maps tvTicker -> epoch ms when ticker was last opened
 */
export class RecentTickerRepo extends MapRepo<string, number> implements IRecentTickerRepo {
  /**
   * Creates a new recent ticker repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'recentRepo');
  }

  /** @inheritdoc */
  public getAllTickersAsSet(): Set<string> {
    return new Set(this.getAllKeys());
  }
}
