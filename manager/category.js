/**
 * Manages category-based sets of tickers
 * @class CategoryManager
 */
class CategoryManager {
    /**
     * @param {OrderRepo} orderRepo Repository for order categories
     * @param {FlagRepo} flagRepo Repository for flag categories
     */
    constructor(orderRepo, flagRepo) {
        // TODO: Route CategoryRepo Calls via this Manager
        this._orderRepo = orderRepo;
        this._flagRepo = flagRepo;
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
}