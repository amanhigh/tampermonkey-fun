import { ITickerRepo } from '../repo/ticker';
import { IExchangeRepo } from '../repo/exchange';

/**
 * Interface for managing symbol mappings and transformations across trading platforms
 */
export interface ISymbolManager {
  /**
   * Maps a Kite symbol to TradingView symbol
   * @param kiteSymbol Symbol in Kite format (e.g., "M_M")
   * @returns TradingView formatted symbol (e.g., "M&M")
   */
  kiteToTv(kiteSymbol: string): string;

  /**
   * Maps a TradingView symbol to Kite symbol
   * @param tvSymbol Symbol in TradingView format (e.g., "M&M")
   * @returns Kite formatted symbol (e.g., "M_M")
   */
  tvToKite(tvSymbol: string): string;

  /**
   * Maps TradingView ticker to Investing ticker
   * @param tvTicker TradingView ticker
   * @returns Investing ticker if mapped, undefined otherwise
   */
  tvToInvesting(tvTicker: string): string | undefined;

  /**
   * Maps Investing ticker to TradingView ticker
   * @param investingTicker Investing.com ticker
   * @returns TV ticker if mapped, otherwise original ticker
   */
  investingToTv(investingTicker: string): string;

  /**
   * Maps TradingView ticker to Exchange ticker
   * @param tvTicker TradingView ticker
   * @returns Exchange qualified ticker or original ticker
   */
  tvToExchangeTicker(tvTicker: string): string;

  /**
   * Creates mapping between TradingView and Investing tickers
   * @param tvTicker TradingView ticker
   * @param investingTicker Investing.com ticker
   */
  createTvToInvestingMapping(tvTicker: string, investingTicker: string): void;

  /**
   * Creates mapping between TradingView ticker and Exchange
   * @param tvTicker TradingView ticker
   * @param exchange Exchange identifier (e.g., "NSE")
   */
  createTvToExchangeTickerMapping(tvTicker: string, exchange: string): void;

  // TODO: Clean all mappings, eg. Pair, Ticker, Exchange etc.
}

/**
 * Manages symbol mappings and transformations for trading platforms
 */
export class SymbolManager implements ISymbolManager {
  /**
   * Maps Kite symbols to TradingView symbols
   * @private
   */
  private readonly _kiteToTvSymbolMap: Readonly<Record<string, string>> = Object.freeze({
    M_M: 'M&M',
    M_MFIN: 'M&MFIN',
  });

  /**
   * Maps TradingView symbols to Kite symbols
   * @private
   */
  private readonly _tvToKiteSymbolMap: Readonly<Record<string, string>>;

  /**
   * Initializes the SymbolManager with reverse mappings
   * @param tickerRepo Repository for ticker mappings
   * @param exchangeRepo Repository for exchange mappings
   */
  constructor(
    private readonly _tickerRepo: ITickerRepo,
    private readonly _exchangeRepo: IExchangeRepo
  ) {
    this._tvToKiteSymbolMap = this._generateTvToKiteSymbolMap();
    Object.freeze(this._tvToKiteSymbolMap);
  }

  /** @inheritdoc */
  kiteToTv(kiteSymbol: string): string {
    return this._kiteToTvSymbolMap[kiteSymbol] || kiteSymbol;
  }

  /** @inheritdoc */
  tvToKite(tvSymbol: string): string {
    return this._tvToKiteSymbolMap[tvSymbol] || tvSymbol;
  }

  /** @inheritdoc */
  tvToInvesting(tvTicker: string): string | undefined {
    return this._tickerRepo.getInvestingTicker(tvTicker);
  }

  /** @inheritdoc */
  investingToTv(investingTicker: string): string {
    return this._tickerRepo.getTvTicker(investingTicker) || investingTicker;
  }

  /** @inheritdoc */
  tvToExchangeTicker(tvTicker: string): string {
    return this._exchangeRepo.getExchangeTicker(tvTicker);
  }

  /** @inheritdoc */
  createTvToInvestingMapping(tvTicker: string, investingTicker: string): void {
    this._tickerRepo.pinInvestingTicker(tvTicker, investingTicker);
    // TODO: mapAlert(investingTicker, getExchange()); Move to Handler createTvToExchangeTickerMapping
  }

  /** @inheritdoc */
  createTvToExchangeTickerMapping(tvTicker: string, exchange: string): void {
    this._exchangeRepo.pinExchange(tvTicker, exchange);
  }

  /**
   * Generates TradingView to Kite symbol mapping from kite to tv map
   * @private
   * @returns TradingView to Kite symbol map
   */
  private _generateTvToKiteSymbolMap(): Record<string, string> {
    return Object.entries(this._kiteToTvSymbolMap).reduce(
      (reverseMap, [kiteSymbol, tvSymbol]) => {
        reverseMap[tvSymbol] = kiteSymbol;
        return reverseMap;
      },
      {} as Record<string, string>
    );
  }
}
