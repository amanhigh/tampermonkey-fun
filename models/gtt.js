class Order {
    sym
    qty
    type
    id
    prices

    constructor(sym, qty, type, id, prices) {
        this.sym = sym;
        this.qty = qty;
        this.type = type;
        this.id = id;
        this.prices = prices;
    }
}

class GttOrderMap {
    orders

    constructor() {
        this.orders = {};
    }

    addOrder(sym, leg) {
        if (!this.orders[sym]) {
            this.orders[sym] = [];
        }
        this.orders[sym].push(leg);
    }

    getOrdersForTicker(ticker) {
        return this.orders[ticker] || [];
    }

    getCount() {
        return Object.keys(this.orders).length;
    }

    static loadFromGMValue(key, defaultValue = {}) {
        const storedValue = GM_getValue(key, defaultValue);
        const gttOrderMap = new GttOrderMap();

        if (typeof storedValue === 'object' && storedValue !== null) {
            Object.keys(storedValue.orders || {}).forEach(symbol => {
                storedValue.orders[symbol].forEach(order => {
                    gttOrderMap.addOrder(symbol, order);
                });
            });
        } else {
            console.warn('Retrieved value is not a valid object. Using empty GttOrderMap.');
        }

        return gttOrderMap;
    }

    toObject() {
        return {
            orders: { ...this.orders }
        };
    }
}