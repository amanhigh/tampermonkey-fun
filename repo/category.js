/**
 * Base class for repositories managing category lists
 */
class CategoryListRepository extends BaseRepo {
    /**
     * @protected
     * @type {CategoryLists}
     */
    _categoryLists;

    constructor(storeId) {
        super(storeId);
        this._categoryLists = this._load();
    }

    /**
     * Deserialize storage data into CategoryLists
     * @protected
     * @param {Object} data Raw storage data
     * @returns {CategoryLists} Deserialized category lists
     */
    _deserialize(data) {
        const map = new Map();
        Object.entries(data).forEach(([key, value]) => {
            map.set(Number(key), new Set(value));
        });
        return new CategoryLists(map);
    }

    /**
     * Serialize CategoryLists for storage
     * @protected
     * @returns {Object} Serialized data
     */
    _serialize() {
        const storeData = {};
        this._categoryLists._lists.forEach((value, key) => {
            storeData[key] = [...value];
        });
        return storeData;
    }

    /**
     * Process cleanup of items not in watchlist
     * @protected
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