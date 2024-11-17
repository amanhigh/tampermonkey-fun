/**
 * Repository for managing recent tickers
 */
class RecentTickerRepo extends SetRepo {
    constructor() {
        super(recentTickerStore);
    }
}