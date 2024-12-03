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
export abstract class SetRepo<T> extends BaseRepo<Set<T>> implements ISetRepo<T> {
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
    this._set = new Set<T>();
    this.load()
      .then((data) => {
        this._set = data;
      })
      .catch(() => {
        console.error(`Failed to load ${this._storeId}`);
      });
  }

  /**
   * @inheritdoc
   */
  protected _deserialize(data: any): Set<T> {
    return new Set(data as T[]);
  }

  /**
   * @inheritdoc
   */
  protected _serialize(): any {
    return Array.from(this._set);
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
