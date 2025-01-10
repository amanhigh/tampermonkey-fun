import { IRepoCron } from './cron';
import { BaseRepo, IBaseRepo } from './base';
import { CategoryLists, SerializedCategoryData } from '../models/category';

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
export abstract class CategoryRepo extends BaseRepo<CategoryLists, SerializedCategoryData> implements ICategoryRepo {
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
    this.load()
      .then((data) => {
        this._categoryLists = data;
      })
      .catch(() => {
        console.error(`Failed to load ${this._storeId}`);
      });
  }

  /**
   * Serialize category lists for storage
   * @protected
   * @returns Serialized category lists data
   */
  protected _serialize(): SerializedCategoryData {
    const obj: { [key: number]: string[] } = {};
    this._categoryLists.getLists().forEach((value, key) => {
      obj[key] = Array.from(value);
    });
    return obj;
  }

  /**
   * Deserialize category lists from storage
   * @protected
   * @param data Raw storage data
   * @returns Deserialized CategoryLists instance
   */
  protected _deserialize(data: SerializedCategoryData): CategoryLists {
    const map = new Map<number, Set<string>>();
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        map.set(Number(key), new Set(value as string[]));
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
