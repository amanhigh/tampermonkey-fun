import { IRepoCron } from './cron';
import { BaseRepo, IBaseRepo } from './base';

/**
 * Interface for Set-based repository operations
 */
export interface ISetRepo<T> extends IBaseRepo<Set<T>> {
  /**
   * Add item to set
   * @param item Item to add
   */
  add(item: T): void;

  /**
   * Remove item from set
   * @param item Item to remove
   * @returns True if item was removed
   */
  delete(item: T): boolean;

  /**
   * Check if item exists in set
   * @param item Item to check
   * @returns True if item exists
   */
  has(item: T): boolean;

  /**
   * Get all items
   * @returns Set of all items
   */
  getAll(): Set<T>;

  /**
   * Get count of items
   * @returns Number of items in set
   */
  getCount(): number;

  /**
   * Clear all items
   */
  clear(): void;
}

/**
 * Base repository for Set-based storage
 */
export abstract class SetRepo<T> extends BaseRepo<Set<T>, T[]> implements ISetRepo<T> {
  /**
   * Internal set storage
   * @protected
   */
  protected _set: Set<T>;

  /**
   * Creates a new set repository
   * @param repoCron Repository auto-save manager
   * @param storeId Storage identifier
   */
  constructor(repoCron: IRepoCron, storeId: string) {
    super(repoCron, storeId);
    this._set = this.createEmptyData();
    this.load()
      .then((data) => {
        this._set = data;
      })
      .catch(() => {
        this._set = this.createEmptyData();
      });
  }

  /**
   * Create an empty Set
   * @protected
   * @returns Empty Set instance
   */
  protected createEmptyData(): Set<T> {
    return new Set();
  }

  /**
   * Serialize Set into an array for storage
   * @protected
   * @returns Array representation of the Set
   */
  protected _serialize(): Array<T> {
    return Array.from(this._set); // Convert Set to array
  }

  /**
   * Deserialize array back into a Set
   * @protected
   * @param data Array of items to deserialize
   * @returns Set instance
   * @throws Error if data is invalid or not an array
   */
  protected _deserialize(data: Array<T>): Set<T> {
    // Validate input data
    if (!Array.isArray(data)) {
      console.warn(`Expected an array for deserialization, but got ${typeof data}. Returning empty Set.`);
      return new Set();
    }

    // Protect against empty or invalid data
    if (data.length === 0) {
      console.warn('Deserialized data is empty. Returning empty Set.');
      return new Set();
    }

    // Convert array back to Set
    return new Set(data);
  }

  /**
   * Generate a log message for loaded data
   * @protected
   * @param data Array of loaded data
   * @returns Log message
   */
  protected getLoadedLogMessage(data: Array<T>): string {
    return `Loaded Set: (${this._storeId}) - ${data.length}`;
  }

  /**
   * @inheritdoc
   */
  public add(item: T): void {
    this._set.add(item);
  }

  /**
   * @inheritdoc
   */
  public delete(item: T): boolean {
    return this._set.delete(item);
  }

  /**
   * @inheritdoc
   */
  public has(item: T): boolean {
    return this._set.has(item);
  }

  /**
   * @inheritdoc
   */
  public getAll(): Set<T> {
    return new Set(this._set);
  }

  /**
   * @inheritdoc
   */
  public getCount(): number {
    return this._set.size;
  }

  /**
   * @inheritdoc
   */
  public clear(): void {
    this._set.clear();
  }
}
