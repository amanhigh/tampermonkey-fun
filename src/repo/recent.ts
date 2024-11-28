import { IRepoCron } from "./cron";
import { SetRepo, ISetRepo } from "./set";

/**
 * Interface for recent ticker repository operations
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IRecentTickerRepo extends ISetRepo<string> {
    // Using base SetRepo methods
}

/**
 * Repository for managing recently viewed tickers
 */
export class RecentTickerRepo extends SetRepo<string> implements IRecentTickerRepo {
    /**
     * Creates a new recent ticker repository
     * @param repoCron Repository auto-save manager
     */
    constructor(repoCron: IRepoCron) {
        super(repoCron, "recentRepo");
    }
}
