import { BaseRepo } from './base';

export interface IRepoCron {
  /**
   * Registers a repository for automatic saving
   * @param repository Repository to register
   */
  registerRepository(repository: BaseRepo<unknown>): void;
}

export class RepoCron implements IRepoCron {
  private readonly _repositories: Set<BaseRepo<unknown>>;
  private static readonly SAVE_INTERVAL = 30 * 1000; // 30 seconds

  constructor() {
    this._repositories = new Set();
    this._setupCron();
  }

  private _setupCron(): void {
    setInterval(() => void this._saveRepositories(), RepoCron.SAVE_INTERVAL);
  }

  public registerRepository(repository: BaseRepo<unknown>): void {
    this._repositories.add(repository);
  }

  private async _saveRepositories(): Promise<void> {
    for (const repository of this._repositories) {
      try {
        await repository.save();
      } catch (error) {
        console.error(`Failed to save repository: ${error as Error}`);
      }
    }
  }
}
