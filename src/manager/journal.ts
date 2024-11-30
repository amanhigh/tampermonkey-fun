import { ICategoryManager } from './category';
import { ISequenceManager } from './sequence';

/**
 * Interface for managing trading journal operations
 */
export interface IJournalManager {
  /**
   * Creates a journal entry tag used for naming trading journal images
   * Format: TICKER.SEQUENCE.TIMEFRAME.TYPE.REASON
   * Example: "HGS.yr.trend.rejected.oe"
   *
   * Flow:
   * 1. TICKER: Trading symbol (e.g., "HGS")
   * 2. SEQUENCE: Lowercased sequence from current sequence (e.g., "YR" -> "yr")
   * 3. TIMEFRAME: Trading timeframe identifier (e.g., "trend")
   * 4. TYPE: Based on ticker's category:
   *    - "set" if ticker in category 2
   *    - "result" if ticker in categories 0,1,4
   *    - "rejected" otherwise
   * 5. REASON: Trading reason code if provided (e.g., "oe")
   *
   * @param ticker - Trading symbol to create entry for
   * @param timeframe - Trading timeframe identifier
   * @param reason - Optional trading reason code
   * @returns Formatted journal tag (e.g., "HGS.yr.trend.rejected.oe")
   */
  createEntry(ticker: string, timeframe: string, reason: string): string;
}

/**
 * Manages trading journal entries and operations
 */
export class JournalManager implements IJournalManager {
  /**
   * @param categoryManager - Category manager for checking ticker status
   * @param sequenceManager - Manager for getting current sequence
   */
  constructor(
    private readonly categoryManager: ICategoryManager,
    private readonly sequenceManager: ISequenceManager
  ) {}

  // TODO: JournalHandler
  // function RecordJournal() {
  //     ReasonPrompt(function (reason) {
  // tag = createEntry
  //         //Put All in Journal with Type
  //         RecordTicker(tag);
  //     })
  // }
  /** @inheritdoc */
  createEntry(ticker: string, timeframe: string, reason: string): string {
    // Get and lowercase current sequence (e.g., "YR" -> "yr")
    const sequence = this.sequenceManager.getCurrentSequence().toLowerCase();

    // Determine entry type based on categories
    const type = this._determineEntryType(ticker);

    // Build parts of the tag
    const parts = [
      ticker, // TICKER
      sequence, // SEQUENCE
      timeframe, // TIMEFRAME
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
   * @private
   * @param ticker - Trading symbol to check
   * @returns Entry type classification ('set', 'result', or 'rejected')
   */
  private _determineEntryType(ticker: string): string {
    const setCategory = this.categoryManager.getOrderCategory(2);
    if (setCategory.has(ticker)) {
      return 'set';
    }
    if (this._isInResultCategories(ticker)) {
      return 'result';
    }
    return 'rejected';
  }

  /**
   * Checks if ticker is in result categories (0, 1, or 4)
   * @private
   * @param ticker - Trading symbol to check
   * @returns True if ticker is in result categories
   */
  private _isInResultCategories(ticker: string): boolean {
    return (
      this.categoryManager.getWatchCategory(0).has(ticker) ||
      this.categoryManager.getWatchCategory(1).has(ticker) ||
      this.categoryManager.getWatchCategory(4).has(ticker)
    );
  }
}
