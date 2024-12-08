import { Trend } from '../models/trading';
import { IWatchManager } from './watch';
import { ISequenceManager } from './sequence';

/**
 * Interface for managing trading journal operations
 */
export interface IJournalManager {
  /**
   * Creates a journal entry tag used for naming trading journal images
   * Format: TICKER.SEQUENCE.TREND.TYPE.REASON
   * Example: "HGS.yr.trend.rejected.oe"
   *
   * Flow:
   * 1. TICKER: Trading symbol (e.g., "HGS")
   * 2. SEQUENCE: Lowercased sequence from current sequence (e.g., "YR" -> "yr")
   * 3. TREND: Trading trend type (trend/ctrend)
   * 4. TYPE: Based on ticker's category:
   *    - "set" if ticker in category 2
   *    - "result" if ticker in categories 0,1,4
   *    - "rejected" otherwise
   * 5. REASON: Trading reason code if provided (e.g., "oe")
   *
   * @param ticker - Trading symbol to create entry for
   * @param trend - Trading trend type
   * @param reason - Optional trading reason code
   * @returns Formatted journal tag (e.g., "HGS.yr.trend.rejected.oe")
   */
  createEntry(ticker: string, trend: Trend, reason: string): string;
}

/**
 * Manages trading journal entries and operations
 */
export class JournalManager implements IJournalManager {
  /**
   * @param watchManager - Watch manager for checking ticker status
   * @param sequenceManager - Manager for getting current sequence
   */
  constructor(
    private readonly watchManager: IWatchManager,
    private readonly sequenceManager: ISequenceManager
  ) {}

  /** @inheritdoc */
  createEntry(ticker: string, trend: Trend, reason: string): string {
    // Get and lowercase current sequence (e.g., "YR" -> "yr")
    const sequence = this.sequenceManager.getCurrentSequence().toLowerCase();

    // Determine entry type based on categories
    const type = this.determineEntryType(ticker);

    // Build parts of the tag
    const parts = [
      ticker, // TICKER
      sequence, // SEQUENCE
      trend, // TREND
      type, // TYPE
    ];

    // Add reason if provided and valid
    if (reason && reason !== '' && reason !== 'Cancel') {
      parts.push(reason); // REASON
    }

    // Join with dots to create final tag
    return parts.join('.');
  }

  /**
   * Determines the type of journal entry based on ticker's presence in order sets
   * @param ticker - Trading symbol to check
   * @returns Entry type classification ('set', 'result', or 'rejected')
   */
  private determineEntryType(ticker: string): string {
    const setCategory = this.watchManager.getCategory(2);
    if (setCategory.has(ticker)) {
      return 'set';
    }
    if (this.isInResultCategories(ticker)) {
      return 'result';
    }
    return 'rejected';
  }

  /**
   * Checks if ticker is in result categories (0, 1, or 4)
   * @param ticker - Trading symbol to check
   * @returns True if ticker is in result categories
   */
  private isInResultCategories(ticker: string): boolean {
    return (
      this.watchManager.getCategory(0).has(ticker) ||
      this.watchManager.getCategory(1).has(ticker) ||
      this.watchManager.getCategory(4).has(ticker)
    );
  }
}
