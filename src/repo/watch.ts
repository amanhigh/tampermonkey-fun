import { IRepoCron } from './cron';
import { CategoryRepo, ICategoryRepo } from './category';
import { CategoryLists } from '../models/category';
import { WatchChangeEvent } from '../models/events';
import { Constants } from '../models/constant';

/**
 * Interface for watchlist operations
 */
export interface IWatchlistRepo extends ICategoryRepo {
  /**
   * Get the watch category lists
   * @returns Category lists containing orders
   */
  getWatchCategoryLists(): CategoryLists;

  /**
   * Create and store a watch change event
   * @param event WatchChangeEvent to store
   * @returns Promise resolving after event is stored
   */
  createWatchChangeEvent(event: WatchChangeEvent): Promise<void>;
}

/**
 * Repository for managing order lists
 */
export class Watchlistrepo extends CategoryRepo implements IWatchlistRepo {
  /**
   * Creates a new order repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'watchRepo');
  }

  /**
   * Get the order category lists
   * @returns Category lists containing orders
   */
  public getWatchCategoryLists(): CategoryLists {
    return this._categoryLists;
  }

  /**
   * Create and store a watch change event
   * Uses stringify() method of WatchChangeEvent for serialization
   * @param event WatchChangeEvent to store
   * @returns Promise resolving after event is stored
   */
  public async createWatchChangeEvent(event: WatchChangeEvent): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.TV_WATCH_CHANGE, event.stringify());
  }
}
