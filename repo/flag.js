/**
 * Repository for managing flag lists
 */
class FlagRepo extends CategoryRepo {
    constructor() {
        super(flagInfoStore);
    }

    /**
     * Get the flag category lists
     * @returns {CategoryLists} Category lists containing flags
     */
    getFlagCategoryLists() {
        return this._categoryLists;
    }
}