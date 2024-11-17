/**
 * Repository for managing order list persistence and cleanup
 */
class OrderRepository {
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
        this._storeId = orderInfoStore;
        this._categoryLists = this._load();
    }

    /**
     * Get the order category lists
     * @returns {CategoryLists} Category lists containing orders
     */
    getOrderCategoryLists() {
        return this._categoryLists;
    }

    /**
     * Load order data from storage
     * @private
     * @returns {CategoryLists} Category lists containing orders
     */
    _load() {
        const storeData = GM_getValue(this._storeId, {});
        const orderMap = new Map();
        
        Object.entries(storeData).forEach(([key, value]) => {
            orderMap.set(Number(key), new Set(value));
        });
        
        return new CategoryLists(orderMap);
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