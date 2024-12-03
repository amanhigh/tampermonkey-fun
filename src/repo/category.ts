import { IRepoCron } from './cron';
import { BaseRepo, IBaseRepo, SerializedData } from './base';
import { CategoryLists } from '../models/category';

/**
 * Interface for category repository operations
 * @extends IBaseRepo<CategoryLists>
 */
export interface ICategoryRepo extends IBaseRepo<CategoryLists> {
  /**
   * Get total count of lists
   * @returns Number of category lists
   */
  getCount(): number;
}

/**
 * Repository for managing category lists
 * Implements persistence and CRUD operations for CategoryLists
 */
export abstract class CategoryRepo extends BaseRepo<CategoryLists> implements ICategoryRepo {
  /**
   * The category lists data structure
   * @protected
   */
  protected _categoryLists: CategoryLists;

  /**
   * Creates a new category repository
   * @param repoCron Repository auto-save manager
   * @param storeId Storage identifier
   */
  constructor(repoCron: IRepoCron, storeId: string) {
    super(repoCron, storeId);
    // Initialize with empty map until loaded
    this._categoryLists = new CategoryLists(new Map());
  }

  /**
   * Serialize category lists for storage
   * @protected
   * @returns Serialized category lists data
   */
  protected _serialize(): string {
    return JSON.stringify(this._categoryLists);
  }

  /**
   * Deserialize category lists from storage
   * @protected
   * @param data Raw storage data
   * @returns Deserialized CategoryLists instance
   */
  protected _deserialize(data: SerializedData): CategoryLists {
    const map = new Map<number, Set<string>>();
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const stringSet = new Set(value.map((item) => String(item)));
        map.set(Number(key), stringSet);
      }
    });
    return new CategoryLists(map);
  }

  /**
   * Get total number of category lists
   * @returns Number of lists in the repository
   */
  public getCount(): number {
    return this._categoryLists.getSize();
  }
}
