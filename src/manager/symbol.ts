import { ITickerClient } from '../client/ticker';
import { Notifier } from '../util/notify';

/**
 * Interface for symbol formatting and transformation helpers.
 *
 * Responsible for pure string transforms and exchange-qualified ticker formatting.
 * No backend data-mapping methods — those live in TickerManager and AlertTickerManager.
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
   * Checks if symbol is a composite symbol containing special characters like '/', '*', '-', ':'
   * or matching special-case composite tickers.
   * @param symbol Symbol to check
   * @returns True if symbol is composite
   */
  isComposite(symbol: string): boolean;

  /**
   * Formats a TV ticker to exchange-qualified form ("EXCHANGE:ticker").
   * Falls back to raw ticker when backend read fails or exchange is absent.
   * @param tvTicker TradingView ticker
   * @returns Promise resolving to exchange qualified ticker or original ticker
   */
  tvToExchangeTicker(tvTicker: string): Promise<string>;
}

/**
 * Symbol formatting and transformation helpers.
 *
 * Kept separate from TickerManager/AlertTickerManager because these are pure
 * string operations or formatting helpers, not data-management concerns.
 */
export class SymbolManager implements ISymbolManager {
  private readonly kiteToTvSymbolMap: Readonly<Record<string, string>> = Object.freeze({
    M_M: 'M&M',
    M_MFIN: 'M&MFIN',
  });

  private readonly tvToKiteSymbolMap: Readonly<Record<string, string>>;

  private readonly COMPOSITE_CHARACTERS = ['/', '*', '-', ':'];

  private readonly SPECIAL_COMPOSITE_TICKERS = new Set(['GOLDSILVER', 'BTC.D']);

  constructor(private readonly tickerClient: ITickerClient) {
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
  async tvToExchangeTicker(tvTicker: string): Promise<string> {
    try {
      const record = await this.tickerClient.getTicker(tvTicker);
      if (record.exchange) {
        return `${record.exchange}:${tvTicker}`;
      }
      return tvTicker;
    } catch (error) {
      Notifier.warn(`tvToExchangeTicker: ${(error as Error).message}. Returning raw ticker.`);
      return tvTicker;
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
