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
   * @returns Investing ticker if mapped, null if no mapping exists
   */
  tvToInvesting(tvTicker: string): string | null;

  /**
   * Maps Investing ticker to TradingView ticker
   * @param investingTicker Investing.com ticker
   * @returns TV ticker if mapped, null if no mapping exists
   */
  investingToTv(investingTicker: string): string | null;

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
   * Removes mapping between TradingView and Investing tickers
   * @param investingTicker Investing.com ticker to unmap
   */
  removeTvToInvestingMapping(investingTicker: string): void;

  /**
   * Creates mapping between TradingView ticker and Exchange
   * @param tvTicker TradingView ticker
   * @param exchange Exchange identifier (e.g., "NSE")
   */
  createTvToExchangeTickerMapping(tvTicker: string, exchange: string): void;

  /**
   * Checks if symbol is a composite symbol containing special characters like '/' or '*'
   * @param symbol Symbol to check
   * @returns True if symbol is composite
   */
  isComposite(symbol: string): boolean;

  // TODO: #A Audit & Clean all mappings, eg. Pair, Ticker, Exchange etc by Matching each Repo
}

// FIXME: #A Alias Support for Dual Mapping.

/*
 *
 * Manages symbol mappings and transformations for trading platforms
 */
export class SymbolManager implements ISymbolManager {
  /**
   * Maps Kite symbols to TradingView symbols
   * @private
   */
  private readonly kiteToTvSymbolMap: Readonly<Record<string, string>> = Object.freeze({
    M_M: 'M&M',
    M_MFIN: 'M&MFIN',
  });

  /**
   * Maps TradingView symbols to Kite symbols
   * @private
   */
  private readonly tvToKiteSymbolMap: Readonly<Record<string, string>>;

  /**
   * Special characters that indicate a composite symbol
   * @private
   */
  private readonly COMPOSITE_CHARACTERS = ['/', '*'];

  /**
   * Initializes the SymbolManager with reverse mappings
   * @param tickerRepo Repository for ticker mappings
   * @param exchangeRepo Repository for exchange mappings
   */
  constructor(
    private readonly tickerRepo: ITickerRepo,
    private readonly exchangeRepo: IExchangeRepo
  ) {
    this.tvToKiteSymbolMap = this.generateTvToKiteSymbolMap();
    Object.freeze(this.tvToKiteSymbolMap);
  }

  /** @inheritdoc */
  kiteToTv(kiteSymbol: string): string {
    return this.kiteToTvSymbolMap[kiteSymbol] || kiteSymbol;
  }

  /** @inheritdoc */
  tvToKite(tvSymbol: string): string {
    return this.tvToKiteSymbolMap[tvSymbol] || tvSymbol;
  }

  /** @inheritdoc */
  tvToInvesting(tvTicker: string): string | null {
    return this.tickerRepo.getInvestingTicker(tvTicker);
  }

  /** @inheritdoc */
  investingToTv(investingTicker: string): string | null {
    return this.tickerRepo.getTvTicker(investingTicker);
  }

  /** @inheritdoc */
  tvToExchangeTicker(tvTicker: string): string {
    return this.exchangeRepo.getExchangeTicker(tvTicker);
  }

  /** @inheritdoc */
  createTvToInvestingMapping(tvTicker: string, investingTicker: string): void {
    this.tickerRepo.pinInvestingTicker(tvTicker, investingTicker);
  }

  /** @inheritdoc */
  removeTvToInvestingMapping(investingTicker: string): void {
    // Get the tvTicker before removing to use tickerRepo.delete()
    const tvTicker = this.investingToTv(investingTicker);
    if (tvTicker) {
      // Remove from tickerRepo (handles both forward and reverse mappings)
      this.tickerRepo.delete(tvTicker);
    }
  }

  /** @inheritdoc */
  createTvToExchangeTickerMapping(tvTicker: string, exchange: string): void {
    this.exchangeRepo.pinExchange(tvTicker, exchange);
  }

  /** @inheritdoc */
  public isComposite(symbol: string): boolean {
    return this.COMPOSITE_CHARACTERS.some((char) => symbol.includes(char));
  }

  /**
   * Generates TradingView to Kite symbol mapping from kite to tv map
   * @private
   * @returns TradingView to Kite symbol map
   */
  private generateTvToKiteSymbolMap(): Record<string, string> {
    return Object.entries(this.kiteToTvSymbolMap).reduce(
      (reverseMap, [kiteSymbol, tvSymbol]) => {
        reverseMap[tvSymbol] = kiteSymbol;
        return reverseMap;
      },
      {} as Record<string, string>
    );
  }
}
