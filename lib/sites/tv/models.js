/**
 * Manages Sets
 */
class AbstractSet {
    storeId;
    setMap;

    constructor(storeId, count) {
        this.storeId = storeId;
        this.setMap = this.load(storeId, count);
    }

    /**
     * Load StoreId into a Map of Sets
     * @param storeId StoreId in GreaseMonkey
     * @param count Count of Sets required to be maintened
     * @returns SetMap with key as number and value as set of values.
     */
    load(storeId, count) {
        let setMap = new Map();
        let storeMap = GM_getValue(storeId, {});

        for (let i = 0; i < count; i++) {
            setMap.set(i, new Set(storeMap[i] || []));
        }
        // console.log('Loaded SetMap', setMap);
        return setMap;
    }

    save() {
        let storeMap = {}
        this.setMap.forEach((v, i) => storeMap[i] = [...v]);
        // console.log("Saving OrderSet", storeMap);
        GM_setValue(this.storeId, storeMap);
        return this.setMap;
    }

    toggle(listNo, ticker) {
        if (this.setMap.get(listNo).has(ticker)) {
            this.delete(listNo, ticker);
        } else {
            this.add(listNo, ticker);
        }
    }

    add(listNo, ticker) {
        this.setMap.get(listNo).add(ticker);
        message(`Ticker Watched: ${ticker}`, colorList[listNo]);

        //Post Process
        this.postAdd(listNo, ticker);
    }

    delete(listNo, ticker) {
        this.setMap.get(listNo).delete(ticker);
        message(`Ticker UnWatched: ${ticker}`, colorList[listNo])
    }

    get(listNo) {
        return this.setMap.get(listNo);
    }

    set(listNo, set) {
        return this.setMap.set(listNo, set);
    }

    contains(listNo, ticker) {
        return this.setMap.get(listNo).has(ticker);
    }

    containsAny(ticker) {
        let found = false;
        this.setMap.forEach((v, i) => {
            if (v.has(ticker)) {
                found = true;
            }
        });
        return found;
    }

    postAdd(listNo, ticker) {
        /* Remove from Any Other List except Current */
        this.setMap.forEach((v, i) => {
            if (i !== listNo && v.has(ticker)) {
                this.delete(i, ticker);
            }
        })
    }
}

class OrderSet extends AbstractSet {
    constructor() {
        super(orderInfoStore, colorList.length);
    }

    dryRunClean() {
        let count = 0;
        let watchListTickers = getTickersWatchList();
        this.setMap.forEach((v, i) => {
            for (let ticker of v) {
                // Simulate deletion check
                if (!watchListTickers.includes(ticker)) {
                    count++;
                }
            }
        });
        return count;
    }

    clean() {
        let count = 0;
        let watchListTickers = getTickersWatchList();
        this.setMap.forEach((v, i) => {
            for (let ticker of v) {
                // Remove All Tickers not in WatchList
                if (!watchListTickers.includes(ticker)) {
                    this.delete(i, ticker);
                    count++;
                }
            }
        });
        return count;
    }
}

class FlagSet extends AbstractSet {
    constructor() {
        super(flagInfoStore, colorList.length);
    }
}

// -- Events

class AlertClicked {
    TvTicker
    InvestingTicker

    constructor(tvTicker, invTicker) {
        this.TvTicker = tvTicker;
        this.InvestingTicker = invTicker;
    }
}

class WatchChangeEvent {
    tickers
    recent

    constructor(watchList, recentList) {
        this.tickers = watchList;
        this.recent = recentList;
    }
}

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
