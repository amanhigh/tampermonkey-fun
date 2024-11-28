import { IRepoCron } from "./cron";
import { MapRepo, IMapRepo } from "./map";

/**
 * Interface for exchange repository operations
 */
export interface IExchangeRepo extends IMapRepo<string, string> {
    /**
     * Get exchange qualified ticker
     * @param tvTicker TradingView ticker
     * @returns Exchange qualified ticker or original ticker
     */
    getExchangeTicker(tvTicker: string): string;

    /**
     * Pin exchange mapping for TV ticker
     * @param tvTicker TradingView ticker
     * @param exchange Exchange identifier
     */
    pinExchange(tvTicker: string, exchange: string): void;
}

/**
 * Maps TradingView tickers to exchange-qualified format
 * Key: TVTicker (e.g., "HDFC")
 * Value: ExchangeTicker (e.g., "NSE:HDFC")
 */
export class ExchangeRepo extends MapRepo<string, string> implements IExchangeRepo {
    /**
     * Creates a new exchange repository
     * @param repoCron Repository auto-save manager
     */
    constructor(repoCron: IRepoCron) {
        super(repoCron, "exchangeRepo");
    }

    /**
     * @inheritdoc
     */
    public getExchangeTicker(tvTicker: string): string {
        return this.get(tvTicker) || tvTicker;
    }

    /**
     * @inheritdoc
     */
    public pinExchange(tvTicker: string, exchange: string): void {
        this.set(tvTicker, `${exchange}:${tvTicker}`);
    }
}
