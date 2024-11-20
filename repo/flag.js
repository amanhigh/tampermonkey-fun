/**
 * Repository for managing flag lists
 */
class FlagRepo extends CategoryRepo {
    /**
     * @param {RepoCron} repoCron Repository auto-save manager
     */
    constructor(repoCron) {
        super(repoCron, "flagRepo");
    }

    /**
     * Get the flag category lists
     * @returns {CategoryLists} Category lists containing flags
     */
    getFlagCategoryLists() {
        return this._categoryLists;
    }
}