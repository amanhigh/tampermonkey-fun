import { IRepoCron } from './cron';
import { CategoryRepo, ICategoryRepo } from './category';
import { CategoryLists } from '../models/category';
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
  createWatchChangeEvent(): Promise<void>;
}

/**
 * Repository for managing order lists
 */
export class Watchlistrepo extends CategoryRepo implements IWatchlistRepo {
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'watchRepo');
  }

  /* @inheritdoc */
  public getWatchCategoryLists(): CategoryLists {
    return this._categoryLists;
  }

  /**
   * Create and store a watch change event
   * @returns Promise resolving after event is stored
   */
  public async createWatchChangeEvent(): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.TV_WATCH_CHANGE, new Date().toDateString());
  }
}
