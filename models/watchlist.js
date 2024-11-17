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
