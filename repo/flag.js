/**
 * Repository for managing flag list persistence and cleanup
 */
class FlagRepository {
    /**
     * @private
     * @type {string}
     */
    _storeId;

    /**
     * @private
     * @type {CategoryLists}
     */
    _categoryLists;

    constructor() {
        this._storeId = flagInfoStore;
        this._categoryLists = this._load();
    }

    /**
     * Get the flag category lists
     * @returns {CategoryLists} Category lists containing flags
     */
    getFlagCategoryLists() {
        return this._categoryLists;
    }

    /**
     * Load flag data from storage
     * @private
     * @returns {CategoryLists} Category lists containing flags
     */
    _load() {
        const storeData = GM_getValue(this._storeId, {});
        const flagMap = new Map();
        
        Object.entries(storeData).forEach(([key, value]) => {
            flagMap.set(Number(key), new Set(value));
        });
        
        return new CategoryLists(flagMap);
    }

    /**
     * Save current category lists to storage
     */
    save() {
        const storeData = {};
        this._categoryLists._lists.forEach((value, key) => {
            storeData[key] = [...value];
        });
        GM_setValue(this._storeId, storeData);
    }

    /**
     * Check how many items would be removed by cleanup
     * @returns {number} Number of items that would be removed
     */
    dryRunClean() {
        return this._processCleanup(false);
    }

    /**
     * Remove items not in watchlist and save changes
     * @returns {number} Number of items removed
     */
    clean() {
        return this._processCleanup(true);
    }

    /**
     * Process cleanup of items not in watchlist
     * @private
     * @param {boolean} executeChanges Whether to actually remove items and save
     * @returns {number} Number of items affected
     */
    _processCleanup(executeChanges) {
        const watchListTickers = getTickersWatchList();
        let count = 0;

        this._categoryLists._lists.forEach((list, key) => {
            for (const ticker of [...list]) {
                if (!watchListTickers.includes(ticker)) {
                    if (executeChanges) {
                        this._categoryLists.delete(key, ticker);
                    }
                    count++;
                }
            }
        });

        if (executeChanges) {
            this.save();
        }

        return count;
    }
}