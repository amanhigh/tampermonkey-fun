import { ITickerRepo } from '../repo/ticker';
import { ITickerClient } from '../client/ticker';
import { TickerUpdateRequest } from '../models/ticker';

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
   * Maps TradingView ticker to Exchange ticker using backend ticker data.
   * Returns "EXCHANGE:ticker" when backend has exchange, otherwise raw ticker.
   * Falls back to raw ticker when backend read fails.
   * @param tvTicker TradingView ticker
   * @returns Promise resolving to exchange qualified ticker or original ticker
   */
  tvToExchangeTicker(tvTicker: string): Promise<string>;

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
   * Sets or clears the exchange on the backend ticker record.
   * Fetches current ticker, sets exchange field to the given value (null to clear), updates backend.
   * @param tvTicker TradingView ticker
   * @param exchange Exchange identifier (e.g. "NSE") or null to clear
   */
  setExchange(tvTicker: string, exchange: string | null): Promise<void>;

  /**
   * Checks if symbol is a composite symbol containing special characters like '/', '*', '-', ':'
   * or matching special-case composite tickers
   * @param symbol Symbol to check
   * @returns True if symbol is composite
   */
  isComposite(symbol: string): boolean;

  /**
   * Deletes a TradingView ticker entry from the ticker repository
   * @param tvTicker TradingView ticker
   */
  deleteTvTicker(tvTicker: string): void;
}

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
  private readonly COMPOSITE_CHARACTERS = ['/', '*', '-', ':'];

  /**
   * Tickers that should always be treated as composite despite lacking separators
   * @private
   */
  private readonly SPECIAL_COMPOSITE_TICKERS = new Set(['GOLDSILVER', 'BTC.D']);

  /**
   * Initializes the SymbolManager with reverse mappings
   * @param tickerRepo Repository for ticker mappings
   * @param tickerClient Client for backend ticker operations
   */
  constructor(
    private readonly tickerRepo: ITickerRepo,
    private readonly tickerClient: ITickerClient
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
  async tvToExchangeTicker(tvTicker: string): Promise<string> {
    try {
      const record = await this.tickerClient.getTicker(tvTicker);
      if (record.exchange) {
        return `${record.exchange}:${tvTicker}`;
      }
      return tvTicker;
    } catch {
      return tvTicker;
    }
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
  async setExchange(tvTicker: string, exchange: string | null): Promise<void> {
    try {
      const record = await this.tickerClient.getTicker(tvTicker);
      const update: TickerUpdateRequest = {
        exchange,
        timeframes: record.timeframes,
        type: record.type,
        state: record.state,
        trend: record.trend,
        is_fno: record.is_fno,
      };
      await this.tickerClient.updateTicker(tvTicker, update);
    } catch {
      // Ticker not yet in backend — silently ignore
    }
  }

  /** @inheritdoc */
  public isComposite(symbol: string): boolean {
    const normalized = symbol.toUpperCase();
    if (this.SPECIAL_COMPOSITE_TICKERS.has(normalized)) {
      return true;
    }

    return this.COMPOSITE_CHARACTERS.some((char) => symbol.includes(char));
  }

  /** @inheritdoc */
  deleteTvTicker(tvTicker: string): void {
    this.tickerRepo.delete(tvTicker);
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
