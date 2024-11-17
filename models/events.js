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

