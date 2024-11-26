/**
 * Repository for managing order lists
 */
class OrderRepo extends CategoryRepo {
    /**
     * @param {RepoCron} repoCron Repository auto-save manager
     */
    constructor(repoCron) {
        super(repoCron, "orderRepo");
    }

    /**
     * Get the order category lists
     * @returns {CategoryLists} Category lists containing orders
     */
    getOrderCategoryLists() {
        return this._categoryLists;
    }
}