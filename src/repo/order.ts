import { IRepoCron } from "./cron";
import { CategoryRepo, ICategoryRepo } from "./category";
import { CategoryLists } from "../models/category";

/**
 * Interface for order repository operations
 */
export interface IOrderRepo extends ICategoryRepo {
    /**
     * Get the order category lists
     * @returns Category lists containing orders
     */
    getOrderCategoryLists(): CategoryLists;
}

/**
 * Repository for managing order lists
 */
export class OrderRepo extends CategoryRepo implements IOrderRepo {
    /**
     * Creates a new order repository
     * @param repoCron Repository auto-save manager
     */
    constructor(repoCron: IRepoCron) {
        super(repoCron, "orderRepo");
    }

    /**
     * Get the order category lists
     * @returns Category lists containing orders
     */
    public getOrderCategoryLists(): CategoryLists {
        return this._categoryLists;
    }
}
