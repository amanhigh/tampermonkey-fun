/**
 * Repository for managing recent tickers
 */
class RecentTickerRepo extends SetRepo {
    /**
     * @param {RepoCron} repoCron Repository auto-save manager
     */
    constructor(repoCron) {
        super(repoCron, "recentRepo");
    }
}