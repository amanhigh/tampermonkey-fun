import { IRepoCron } from "./cron";
import { CategoryRepo, ICategoryRepo } from "./category";
import { CategoryLists } from "../models/category";

/**
 * Interface for watchlist operations
 */
export interface IWatchlistRepo extends ICategoryRepo {
    /**
     * Get the watch category lists
     * @returns Category lists containing orders
     */
    getWatchCategoryLists(): CategoryLists;
}

/**
 * Repository for managing order lists
 */
export class Watchlistrepo extends CategoryRepo implements IWatchlistRepo {
    /**
     * Creates a new order repository
     * @param repoCron Repository auto-save manager
     */
    constructor(repoCron: IRepoCron) {
        super(repoCron, "watchlistRepeo");
    }

    /**
     * Get the order category lists
     * @returns Category lists containing orders
     */
    public getWatchCategoryLists(): CategoryLists {
        return this._categoryLists;
    }
}
