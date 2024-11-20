/**
 * Handles automated saving of repositories at regular intervals
 */
class RepoCron {
    /**
     * @private
     * @type {Set<BaseRepo>}
     */
    _repositories;

    /**
     * @constant
     * @type {number}
     */
    SAVE_INTERVAL = 30 * 1000;    // 30 seconds

    constructor() {
        this._repositories = new Set();
        this._setupCron();
    }

    _setupCron() {
        setInterval(() => this._saveRepositories(), this.SAVE_INTERVAL);
    }

    /**
     * Registers a repository for automatic saving
     * @param {BaseRepo} repository Repository to register
     * @returns {void}
     */
    registerRepository(repository) {
        this._repositories.add(repository);
    }

    /**
     * Saves all registered repositories
     * @private
     */
    _saveRepositories() {
        for (const repository of this._repositories) {
            try {
                repository.save();
                console.log(`Repository saved: ${repository._storeId}`);
            } catch (error) {
                console.error(`Failed to save repository: ${error}`);
            }
        }
    }
}