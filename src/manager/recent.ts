import { Constants } from '../models/constant';
import { IRecentTickerRepo } from '../repo/recent';
import { IPaintManager } from './paint';

/**
 * Interface for managing recent ticker data operations
 */
export interface IRecentManager {
  /**
   * Add ticker to recent list
   * @param tvTicker Ticker to record
   */
  addTicker(tvTicker: string): void;

  /**
   * Check if ticker exists in recent list
   * @param tvTicker Ticker to check
   */
  isRecent(tvTicker: string): boolean;

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
  public addTicker(tvTicker: string): void {
    this.recentRepo.add(tvTicker);
  }

  /** @inheritdoc */
  public isRecent(tvTicker: string): boolean {
    return this.recentRepo.has(tvTicker);
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
