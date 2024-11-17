/**
 * Coordinates persistence of all repositories
 */
class DataSilo {
    /**
     * @param {TickerRepo} tickerRepo
     * @param {ExchangeRepo} exchangeRepo
     * @param {SequenceRepo} sequenceRepo
     * @param {RecentTickerRepo} recentTickerRepo
     */
    constructor(tickerRepo, exchangeRepo, sequenceRepo, recentTickerRepo) {
        this.tickerRepo = tickerRepo;
        this.exchangeRepo = exchangeRepo;
        this.sequenceRepo = sequenceRepo;
        this.recentTickerRepo = recentTickerRepo;
    }

    /**
     * Load DataSilo instance from GM storage
     * @returns {DataSilo} Loaded instance
     */
    static load() {
        const data = GM_getValue(dataSiloStore, {});
        return new DataSilo(
            new TickerRepo(data.tickerMap || {}),
            new ExchangeRepo(data.tvPinMap || {}),
            new SequenceRepo(data.sequenceMap || {}),
            new RecentTickerRepo(data.recentTickers || [])
        );
    }

    /**
     * Save current DataSilo instance to GM storage
     */
    save() {
        GM_setValue(dataSiloStore, {
            tickerMap: this.tickerRepo._tickerMap,
            tvPinMap: this.exchangeRepo._exchangeMap,
            sequenceMap: this.sequenceRepo._sequenceMap,
            recentTickers: [...this.recentTickerRepo._recentTickers]
        });
    }
}