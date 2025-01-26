import { BaseRepo } from './base';

export interface IRepoCron {
  /**
   * Registers a repository for automatic saving
   * @param repository Repository to register
   */
  registerRepository(repository: BaseRepo<unknown>): void;

  /**
   * Saves all registered repositories
   */
  saveAllRepositories(): Promise<void>;
}

export class RepoCron implements IRepoCron {
  private readonly repositories: Set<BaseRepo<unknown>>;

  constructor() {
    this.repositories = new Set();
  }

  public registerRepository(repository: BaseRepo<unknown>): void {
    this.repositories.add(repository);
  }

  public async saveAllRepositories(): Promise<void> {
    for (const repository of this.repositories) {
      await repository.save();
    }
  }
}
