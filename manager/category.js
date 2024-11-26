/**
 * Manages category-based sets of tickers
 * @class CategoryManager
 */
class CategoryManager {
    // TODO: Route CategoryRepo Calls via this Manager
    /**
     * @param {OrderRepo} orderRepo Repository for order categories
     * @param {FlagRepo} flagRepo Repository for flag categories
     * @param {TradingViewWatchlistManager} watchlistManager Watchlist manager
     */
    constructor(orderRepo, flagRepo, watchlistManager) {
        this._orderRepo = orderRepo;
        this._flagRepo = flagRepo;
        this._watchlistManager = watchlistManager;
    }

    /**
     * Gets order category set by index
     * @param {number} categoryIndex Category index
     * @returns {Set<string>} Set of symbols in category
     */
    getOrderCategory(categoryIndex) {
        const categoryLists = this._orderRepo.getOrderCategoryLists();
        return categoryLists.get(categoryIndex);
    }

    /**
     * Gets flag category set by index
     * @param {number} categoryIndex Category index
     * @returns {Set<string>} Set of symbols in category
     */
    getFlagCategory(categoryIndex) {
        const categoryLists = this._flagRepo.getFlagCategoryLists();
        return categoryLists.get(categoryIndex);
    }

    /**
     * Records selected tickers in order category
     * @param {number} categoryIndex Category index to record into
     * @param {Array<string>} selectedTickers List of selected tickers
     */
    recordOrderCategory(categoryIndex, selectedTickers) {
        const categoryLists = this._orderRepo.getOrderCategoryLists();
        this._recordCategory(categoryLists, categoryIndex, selectedTickers);
    }

    /**
     * Records selected tickers in flag category
     * @param {number} categoryIndex Category index to record into
     * @param {Array<string>} selectedTickers List of selected tickers
     */
    recordFlagCategory(categoryIndex, selectedTickers) {
        const categoryLists = this._flagRepo.getFlagCategoryLists();
        this._recordCategory(categoryLists, categoryIndex, selectedTickers);
    }

    /**
     * Updates watchlist category (index 5) with remaining tickers
     * @param {Array<string>} watchListTickers Current watchlist tickers
     */
    updateWatchlistCategory(watchListTickers) {
        //Prep Watchlist Set with all Symbols not in other Order Sets
        const watchSet = new Set(watchListTickers);
        const orderLists = this._orderRepo.getOrderCategoryLists();

        // Remove tickers from other categories (except index 5 which is watchlist)
        for (let i = 0; i < Constants.UI.COLORS.LIST.length; i++) {
            if (i !== 5) { // Skip watchlist category
                orderLists.get(i).forEach(ticker => watchSet.delete(ticker));
            }
        }

        // Update watchlist category
        orderLists.set(5, watchSet);
    }

    /**
     * Records tickers in specified category
     * @private
     * @param {CategoryLists} categoryLists Category lists to update
     * @param {number} categoryIndex Category index
     * @param {Array<string>} tickers Tickers to record
     */
    _recordCategory(categoryLists, categoryIndex, tickers) {
        tickers.forEach(ticker => {
            categoryLists.toggle(categoryIndex, ticker);
        });
    }

    /**
     * Check how many order items would be removed by cleanup
     * @returns {number} Number of items that would be removed
     */
    dryRunClean() {
        return this._processCleanup(false);
    }

    /**
     * Remove order items not in watchlist and save changes
     * @returns {number} Number of items removed
     */
    clean() {
        return this._processCleanup(true);
    }

    /**
     * Process cleanup of order items not in watchlist
     * @private
     * @param {boolean} executeChanges Whether to actually remove items and save
     * @returns {number} Number of items affected
     */
    _processCleanup(executeChanges) {
        const watchListTickers = this._watchlistManager.getTickers();
        let count = 0;

        const categoryLists = this._orderRepo.getOrderCategoryLists();
        
        categoryLists._lists.forEach((list, key) => {
            for (const ticker of [...list]) {
                if (!watchListTickers.includes(ticker)) {
                    if (executeChanges) {
                        categoryLists.delete(key, ticker);
                    }
                    count++;
                }
            }
        });

        return count;
    }
}