export class AlertClicked {
    TvTicker: string;
    InvestingTicker: string;

    constructor(tvTicker: string, invTicker: string) {
        this.TvTicker = tvTicker;
        this.InvestingTicker = invTicker;
    }
}

export class WatchChangeEvent {
    tickers: string[];
    recent: string[];

    constructor(watchList: string[], recentList: string[]) {
        this.tickers = watchList;
        this.recent = recentList;
    }
}
