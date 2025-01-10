import { IRepoCron } from './cron';

/**
 * Interface for serialized data structure in storage
 * @interface
 */
export interface SerializedData {
  [key: string]: unknown;
}

/**
 * Base interface for repository implementations
 * @template T Type of data managed by the repository
 * @interface
 */
export interface IBaseRepo<T> {
  /**
   * Load data from storage
   * @returns Promise resolving to loaded data
   */
  load(): Promise<T>;

  /**
   * Save data to storage
   * @returns Promise that resolves when save is complete
   */
  save(): Promise<void>;
}

/**
 * Abstract base class for repository implementations
 * @template T Type of data managed by the repository
 * @abstract
 */
export abstract class BaseRepo<T, S = unknown> implements IBaseRepo<T> {
  /**
   * Storage identifier for this repository
   * @protected
   */
  protected readonly _storeId: string;

  /**
   * Repository auto-save manager
   * @private
   */
  private readonly _repoCron: IRepoCron;

  /**
   * Creates a new repository instance
   * @param repoCron Repository auto-save manager
   * @param storeId Storage identifier
   */
  constructor(repoCron: IRepoCron, storeId: string) {
    this._repoCron = repoCron;
    this._storeId = storeId;
    this._repoCron.registerRepository(this);
  }

  /**
   * Load data from storage
   * @public
   * @returns Promise resolving to loaded data
   */
  public async load(): Promise<T> {
    const data = await GM.getValue<S>(this._storeId, {} as S);
    console.log(`Loaded ${this._storeId}`, data);
    return this._deserialize(data!);
  }

  /**
   * Save data to storage
   * @public
   * @returns Promise that resolves when save is complete
   */
  public async save(): Promise<void> {
    const data = this._serialize();
    await GM.setValue(this._storeId, data as GM.Value);
  }

  /**
   * Serialize data for storage
   * @protected
   * @returns Serialized data object
   * @abstract
   */
  protected abstract _serialize(): S;

  /**
   * Deserialize data from storage
   * @protected
   * @param data Raw data from storage
   * @returns Deserialized data instance
   * @abstract
   */
  protected abstract _deserialize(data: S): T;
}
