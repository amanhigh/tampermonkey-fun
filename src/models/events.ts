/**
 * Abstract base class for all events
 * Enforces stringify method implementation for serialization
 */
export abstract class BaseEvent {
    /**
     * Serialize event to JSON string for storage
     * @returns JSON string representation of the event
     */
    abstract stringify(): string;
}

export class AlertClicked extends BaseEvent {
    private _tvTicker: string;
    private _investingTicker: string;

    constructor(tvTicker: string, invTicker: string) {
        super();
        this._tvTicker = tvTicker;
        this._investingTicker = invTicker;
    }

    get tvTicker(): string { return this._tvTicker; }
    get investingTicker(): string { return this._investingTicker; }

    set tvTicker(value: string) { this._tvTicker = value; }
    set investingTicker(value: string) { this._investingTicker = value; }

    /**
     * Serialize AlertClicked event to JSON string for storage
     * @returns JSON string representation of the event
     */
    public stringify(): string {
        return JSON.stringify({
            tvTicker: this._tvTicker,
            investingTicker: this._investingTicker
        });
    }
}

export class WatchChangeEvent extends BaseEvent {
    private _tickers: string[];
    private _recent: string[];

    constructor(watchList: string[], recentList: string[]) {
        super();
        this._tickers = [...watchList];
        this._recent = [...recentList];
    }

    get tickers(): string[] { return [...this._tickers]; }
    get recent(): string[] { return [...this._recent]; }

    set tickers(value: string[]) { this._tickers = [...value]; }
    set recent(value: string[]) { this._recent = [...value]; }

    /**
     * Serialize WatchChangeEvent to JSON string for storage
     * @returns JSON string representation of the event
     */
    public stringify(): string {
        return JSON.stringify({
            tickers: this._tickers,
            recent: this._recent
        });
    }
}
