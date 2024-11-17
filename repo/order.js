/**
 * Repository for managing order lists
 */
class OrderRepo extends CategoryRepo {
    constructor() {
        super(orderInfoStore);
    }

    /**
     * Get the order category lists
     * @returns {CategoryLists} Category lists containing orders
     */
    getOrderCategoryLists() {
        return this._categoryLists;
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
}