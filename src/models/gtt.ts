export class Order {
    private _sym: string;
    private _qty: number;
    private _type: string;
    private _id: string;
    private _prices: number[];

    constructor(sym: string, qty: number, type: string, id: string, prices: number[]) {
        this._sym = sym;
        this._qty = qty;
        this._type = type;
        this._id = id;
        this._prices = prices;
    }

    get sym(): string { return this._sym; }
    get qty(): number { return this._qty; }
    get type(): string { return this._type; }
    get id(): string { return this._id; }
    get prices(): number[] { return [...this._prices]; }

    set sym(value: string) { this._sym = value; }
    set qty(value: number) { this._qty = value; }
    set type(value: string) { this._type = value; }
    set id(value: string) { this._id = value; }
    set prices(value: number[]) { this._prices = [...value]; }
}

export class GttOrderMap {
    private orders: Record<string, Order[]>;

    constructor() {
        this.orders = {};
    }

    addOrder(sym: string, leg: Order): void {
        if (!this.orders[sym]) {
            this.orders[sym] = [];
        }
        this.orders[sym].push(leg);
    }

    getOrdersForTicker(ticker: string): Order[] {
        return this.orders[ticker] || [];
    }

    getCount(): number {
        return Object.keys(this.orders).length;
    }

    // FIXME: Move to REepository ?
    static loadFromGMValue(key: string, defaultValue: Record<string, Record<string, Order[]>> = {}): GttOrderMap {
        const storedValue = GM_getValue(key, defaultValue);
        const gttOrderMap = new GttOrderMap();
    
        if (typeof storedValue === 'object' && storedValue !== null) {
            Object.keys(storedValue.orders || {}).forEach(symbol => {
                storedValue.orders[symbol].forEach((order: Order) => {
                    gttOrderMap.addOrder(symbol, order);
                });
            });
        } else {
            console.warn('Retrieved value is not a valid object. Using empty GttOrderMap.');
        }
    
        return gttOrderMap;
    }

    toObject(): { orders: Record<string, Order[]> } {
        return {
            orders: { ...this.orders }
        };
    }
}
