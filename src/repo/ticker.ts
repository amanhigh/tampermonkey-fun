import { IRepoCron } from "./cron";
import { MapRepo, IMapRepo } from "./map";
import { SerializedData } from "./base";

/**
 * Interface for ticker repository operations
 */
export interface ITickerRepo extends IMapRepo<string, string> {
    /**
     * Get investing ticker for given TV ticker
     * @param tvTicker TradingView ticker
     * @returns Investing ticker if mapped, undefined otherwise
     */
    getInvestingTicker(tvTicker: string): string | undefined;

    /**
     * Get TV ticker for given investing ticker
     * @param investingTicker Investing.com ticker
     * @returns TV ticker if mapped, null otherwise
     */
    getTvTicker(investingTicker: string): string | null;

    /**
     * Pin investing ticker mapping and update reverse map
     * @param tvTicker TradingView ticker
     * @param investingTicker Investing.com ticker
     */
    pinInvestingTicker(tvTicker: string, investingTicker: string): void;
}

/**
 * Repository for managing TradingView to Investing.com ticker mappings
 */
export class TickerRepo extends MapRepo<string, string> implements ITickerRepo {
    /**
     * Reverse mapping from investing tickers to TV tickers
     * @private
     */
    private readonly _reverseMap: Map<string, string>;

    /**
     * Creates a new ticker repository
     * @param repoCron Repository auto-save manager
     */
    constructor(repoCron: IRepoCron) {
        super(repoCron, "tickerRepo");
        this._reverseMap = new Map<string, string>();
        void this._buildReverseMap();
    }

    /**
     * @inheritdoc
     */
    protected _deserialize(data: SerializedData): Map<string, string> {
        const tickerMap = new Map<string, string>();
        Object.entries(data).forEach(([tvTicker, investingTicker]) => {
            if (typeof investingTicker === 'string') {
                tickerMap.set(tvTicker, investingTicker);
            }
        });
        return tickerMap;
    }

    /**
     * @inheritdoc
     */
    public getInvestingTicker(tvTicker: string): string | undefined {
        return this.get(tvTicker);
    }

    /**
     * @inheritdoc
     */
    public getTvTicker(investingTicker: string): string | null {
        return this._reverseMap.get(investingTicker) || null;
    }

    /**
     * @inheritdoc
     */
    public pinInvestingTicker(tvTicker: string, investingTicker: string): void {
        this.set(tvTicker, investingTicker);
    }

    /**
     * Rebuilds the reverse ticker map
     * @private
     */
    private _buildReverseMap(): void {
        this._reverseMap.clear();
        this._map.forEach((investingTicker, tvTicker) => {
            this._reverseMap.set(investingTicker, tvTicker);
        });
    }

    /**
     * Override set to maintain reverse map
     * @override
     */
    public override set(key: string, value: string): void {
        super.set(key, value);
        this._reverseMap.set(value, key);
    }

    /**
     * Override delete to maintain reverse map
     * @override
     */
    public override delete(key: string): boolean {
        const value = this.get(key);
        if (value) {
            this._reverseMap.delete(value);
        }
        return super.delete(key);
    }

    /**
     * Override clear to maintain reverse map
     * @override
     */
    public override clear(): void {
        super.clear();
        this._reverseMap.clear();
    }
}
