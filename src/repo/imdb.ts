import { IMDB_CONSTANTS } from '../models/imdb';

/**
 * Interface for IMDB storage operations
 */
export interface ImdbRepo {
  /**
   * Gets auto mode setting from GM storage
   * @returns Current auto mode state
   */
  getAutoMode(): Promise<boolean>;

  /**
   * Updates auto mode setting in GM storage
   * @param enabled New auto mode state
   */
  setAutoMode(enabled: boolean): Promise<void>;
}

/**
 * Repository for managing IMDB settings
 */
export class ImdbRepoImpl implements ImdbRepo {
  /**
   * Gets auto mode setting from GM storage
   * Default is false if not set
   */
  public async getAutoMode(): Promise<boolean> {
    return await GM.getValue(IMDB_CONSTANTS.STORAGE.AUTO_MODE, false);
  }

  /**
   * Updates auto mode setting in GM storage and triggers change event
   * @param enabled New auto mode state
   */
  public async setAutoMode(enabled: boolean): Promise<void> {
    await GM.setValue(IMDB_CONSTANTS.STORAGE.AUTO_MODE, enabled);
  }
}
