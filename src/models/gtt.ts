export class Order {
    sym: string;
    qty: number;
    type: string;
    id: string;
    prices: number[];

    constructor(sym: string, qty: number, type: string, id: string, prices: number[]) {
        this.sym = sym;
        this.qty = qty;
        this.type = type;
        this.id = id;
        this.prices = prices;
    }
}

export class GttOrderMap {
    orders: Record<string, Order[]>;

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
