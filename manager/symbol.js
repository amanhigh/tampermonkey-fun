/**
 * Manages symbol mappings and transformations for trading platforms
 * @class SymbolManager
 */
class SymbolManager {
    /**
     * Maps Kite symbols to TradingView symbols
     * @private
     * @type {Object.<string, string>}
     */
    _kiteToTvSymbolMap = Object.freeze({
        "M_M": "M&M",
        "M_MFIN": "M&MFIN"
    });

    /**
     * Maps TradingView symbols to Kite symbols
     * @private
     * @type {Object.<string, string>}
     */
    _tvToKiteSymbolMap;

    /**
     * Initializes the SymbolManager with reverse mappings
     * @constructor
     * @param {TickerRepo} tickerRepo - Repository for ticker mappings
     * @param {ExchangeRepo} exchangeRepo - Repository for exchange mappings
     */
    constructor(tickerRepo, exchangeRepo) {
        this._tvToKiteSymbolMap = this._generateTvToKiteSymbolMap();
        Object.freeze(this._tvToKiteSymbolMap);
        this._tickerRepo = tickerRepo;
        this._exchangeRepo = exchangeRepo;
    }

    /**
     * Maps a Kite symbol to TradingView symbol
     * @param {string} kiteSymbol - Symbol in Kite format (e.g., "M_M")
     * @returns {string} TradingView formatted symbol (e.g., "M&M")
     * @example
     * symbolManager.kiteToTv("M_M") // returns "M&M"
     */
    kiteToTv(kiteSymbol) {
        return this._kiteToTvSymbolMap[kiteSymbol] || kiteSymbol;
    }

    /**
     * Maps a TradingView symbol to Kite symbol
     * @param {string} tvSymbol - Symbol in TradingView format (e.g., "M&M")
     * @returns {string} Kite formatted symbol (e.g., "M_M")
     * @example
     * symbolManager.tvToKite("M&M") // returns "M_M"
     */
    tvToKite(tvSymbol) {
        return this._tvToKiteSymbolMap[tvSymbol] || tvSymbol;
    }

    /**
     * Generates TradingView to Kite symbol mapping from kite to tv map
     * @private
     * @returns {Object.<string, string>} TradingView to Kite symbol map
     */
    _generateTvToKiteSymbolMap() {
        return Object.entries(this._kiteToTvSymbolMap)
            .reduce((reverseMap, [kiteSymbol, tvSymbol]) => {
                reverseMap[tvSymbol] = kiteSymbol;
                return reverseMap;
            }, {});
    }

    /**
     * Maps TradingView ticker to Investing ticker
     * @param {string} tvTicker - TradingView ticker
     * @returns {string|undefined} Investing ticker if mapped
     */
    tvToInvesting(tvTicker) {
        return this._tickerRepo.getInvestingTicker(tvTicker);
    }

    /**
     * Maps Investing ticker to TradingView ticker
     * @param {string} investingTicker - Investing.com ticker
     * @returns {string} TV ticker if mapped, otherwise original ticker
     */
    investingToTv(investingTicker) {
        return this._tickerRepo.getTvTicker(investingTicker) || investingTicker;
    }

    /**
     * Maps TradingView ticker to Exchange ticker
     * @param {string} tvTicker - TradingView ticker
     * @returns {string} Exchange qualified ticker or original ticker
     */
    tvToExchangeTicker(tvTicker) {
        return this._exchangeRepo.getExchangeTicker(tvTicker);
    }

    /**
     * Creates mapping between TradingView and Investing tickers
     * @param {string} tvTicker - TradingView ticker
     * @param {string} investingTicker - Investing.com ticker
     */
    createTvToInvestingMapping(tvTicker, investingTicker) {
        this._tickerRepo.pinInvestingTicker(tvTicker, investingTicker);
        // TODO: mapAlert(investingTicker, getExchange()); ?
    }

    /**
     * Creates mapping between TradingView ticker and Exchange
     * @param {string} tvTicker - TradingView ticker
     * @param {string} exchange - Exchange identifier (e.g., "NSE")
     */
    createTvToExchangeTickerMapping(tvTicker, exchange) {
        this._exchangeRepo.pinExchange(tvTicker, exchange);
    }
}
