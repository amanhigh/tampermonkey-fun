import { IRepoCron } from './cron';
import { CategoryRepo, ICategoryRepo } from './category';
import { CategoryLists } from '../models/category';

/**
 * Interface for flag repository operations
 */
export interface IFlagRepo extends ICategoryRepo {
  /**
   * Get the flag category lists
   * @returns Category lists containing flags
   */
  getFlagCategoryLists(): CategoryLists;
}

/**
 * Repository for managing flag lists
 */
export class FlagRepo extends CategoryRepo implements IFlagRepo {
  /**
   * Creates a new flag repository
   * @param repoCron Repository auto-save manager
   */
  constructor(repoCron: IRepoCron) {
    super(repoCron, 'flagRepo');
  }

  /**
   * Get the flag category lists
   * @returns Category lists containing flags
   */
  public getFlagCategoryLists(): CategoryLists {
    return this._categoryLists;
  }
}
