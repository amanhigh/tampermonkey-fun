import { IRecentTickerRepo } from '../repo/recent';

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
}

/**
 * Manages recent ticker data operations
 */
export class RecentManager implements IRecentManager {
  constructor(private readonly recentRepo: IRecentTickerRepo) {}

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
}
