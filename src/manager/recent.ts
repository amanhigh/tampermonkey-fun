import { Constants } from '../models/constant';
import { IRecentTickerRepo } from '../repo/recent';
import { IPaintManager } from './paint';

/**
 * Interface for managing recent ticker data operations
 */
export interface IRecentManager {
  /**
   * Add ticker to recent list
   * @param ticker Ticker to record
   */
  addTicker(ticker: string): void;

  /**
   * Check if ticker exists in recent list
   * @param ticker Ticker to check
   */
  isRecent(ticker: string): boolean;

  /**
   * Check if any recent tickers exist
   * @returns True if recent tickers exist
   */
  hasRecent(): boolean;

  /**
   * Clear all recent tickers
   */
  clearRecent(): void;

  /**
   * Paints recent tickers
   */
  paintRecent(): void;
}

/**
 * Manages recent ticker data operations
 */
export class RecentManager implements IRecentManager {
  constructor(
    private readonly recentRepo: IRecentTickerRepo,
    private readonly paintManager: IPaintManager
  ) {}

  /** @inheritdoc */
  public addTicker(ticker: string): void {
    this.recentRepo.add(ticker);
  }

  /** @inheritdoc */
  public isRecent(ticker: string): boolean {
    return this.recentRepo.has(ticker);
  }

  /** @inheritdoc */
  public hasRecent(): boolean {
    return this.recentRepo.getCount() > 0;
  }

  /** @inheritdoc */
  public clearRecent(): void {
    this.recentRepo.clear();
  }

  /** @inheritdoc */
  public paintRecent(): void {
    const screenerSymbolSelector = Constants.DOM.SCREENER.SYMBOL;
    const colorList = Constants.UI.COLORS.LIST;

    const recentTickers = this.recentRepo.getAll();
    this.paintManager.paintSymbols(screenerSymbolSelector, recentTickers, { color: colorList[3] });
  }
}
