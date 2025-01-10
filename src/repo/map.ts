import { IRepoCron } from './cron';
import { BaseRepo, IBaseRepo, SerializedData } from './base';

/**
 * Interface for Map-based repository operations
 * @template K Key type (string or number)
 * @template V Value type
 * @extends IBaseRepo<Map<K, V>>
 */
export interface IMapRepo<K, V> extends IBaseRepo<Map<K, V>> {
  /**
   * Clear all entries from the map
   */
  clear(): void;

  /**
   * Get count of entries in the map
   * @returns Total number of entries
   */
  getCount(): number;

  /**
   * Get all keys in the map
   * @returns Array of all keys
   */
  getAllKeys(): K[];

  /**
   * Check if key exists in map
   * @param key Key to check
   * @returns True if key exists
   */
  has(key: K): boolean;

  /**
   * Get value for key
   * @param key Key to lookup
   * @returns Value if found, undefined otherwise
   */
  get(key: K): V | undefined;

  /**
   * Set value for key
   * @param key Key to set
   * @param value Value to set
   */
  set(key: K, value: V): void;

  /**
   * Delete entry by key
   * @param key Key to delete
   * @returns True if entry was deleted
   */
  delete(key: K): boolean;
}

/**
 * Base repository for Map-based storage
 * @template K Key type (restricted to string or number)
 * @template V Value type
 */
export class MapRepo<K extends string | number, V>
  extends BaseRepo<Map<K, V>, SerializedData>
  implements IMapRepo<K, V>
{
  /**
   * Internal map storage
   * @protected
   */
  protected _map: Map<K, V>;

  /**
   * Creates a new map repository
   * @param repoCron Repository auto-save manager
   * @param storeId Storage identifier
   */
  constructor(repoCron: IRepoCron, storeId: string) {
    super(repoCron, storeId);
    this._map = new Map<K, V>();
  }

  /**
   * Serialize map data for storage
   * @protected
   * @returns Serialized map data
   */
  protected _serialize(): SerializedData {
    const storeData: SerializedData = {};
    this._map.forEach((value, key) => {
      storeData[String(key)] = value;
    });
    return storeData;
  }

  /**
   * Deserialize map data from storage
   * @protected
   * @param data Raw storage data
   * @returns Deserialized Map instance
   */
  protected _deserialize(data: SerializedData): Map<K, V> {
    return new Map(Object.entries(data).map(([key, value]) => [key as K, value as V]));
  }

  /**
   * Clear all entries from the map
   * @public
   */
  public clear(): void {
    this._map.clear();
  }

  /**
   * Get count of entries
   * @public
   * @returns Number of entries in map
   */
  public getCount(): number {
    return this._map.size;
  }

  /**
   * Get all keys
   * @public
   * @returns Array of all keys in map
   */
  public getAllKeys(): K[] {
    return Array.from(this._map.keys());
  }

  /**
   * Check if key exists
   * @public
   * @param key Key to check
   * @returns True if key exists
   */
  public has(key: K): boolean {
    return this._map.has(key);
  }

  /**
   * Get value for key
   * @public
   * @param key Key to lookup
   * @returns Value if found, undefined otherwise
   */
  public get(key: K): V | undefined {
    return this._map.get(key);
  }

  /**
   * Set value for key
   * @public
   * @param key Key to set
   * @param value Value to set
   */
  public set(key: K, value: V): void {
    this._map.set(key, value);
  }

  /**
   * Delete entry by key
   * @public
   * @param key Key to delete
   * @returns True if entry was deleted
   */
  public delete(key: K): boolean {
    return this._map.delete(key);
  }
}
