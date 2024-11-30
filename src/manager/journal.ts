import { CategoryLists } from '../models/category';
import { ICategoryManager } from './category';
import { ISequenceManager } from './sequence';

/**
 * Interface for managing trading journal operations
 */
export interface IJournalManager {
  /**
   * Records a journal entry based on sequence and current context
   * @param buttonId - Button identifier that triggered the record
   * @param reason - User provided reason for the entry
   * @param currentTicker - Current trading symbol
   * @returns Generated journal tag
   */
  createEntry(buttonId: string, reason: string, currentTicker: string): string;
}

/**
 * Manages trading journal entries and operations
 *
 * RecordJournal function records the journal entry based on the timeframe and reason provided.
 * It gets the timeframe from the button clicked, prompts the user for the reason,
 * determines the type of entry based on the ticker and order set, and then copies the entry to the clipboard.
 */
export class JournalManager implements IJournalManager {
  /**
   * @param categoryManager - Category manager
   * @param sequenceManager - Manager for sequence operations
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
  createEntry(buttonId: string, reason: string, currentTicker: string): string {
    // Get sequence preference for current ticker
    const sequence = this.sequenceManager.getCurrentSequence();

    // Build timeframe tag with sequence
    // TODO: buttonId earlier this.id ?
    const timeframeTag = `${sequence.toLowerCase()}.${buttonId}`;

    // Determine entry type based on order status
    const type = this._determineEntryType(currentTicker);

    // Build final tag with reason if provided
    const finalType = this._appendReason(type, reason);

    // Construct complete journal tag
    return `${currentTicker}.${timeframeTag}.${finalType}`;
  }

  /**
   * Determines the type of journal entry based on ticker's presence in order sets
   * @private
   * @param ticker - Trading symbol to check
   * @returns Entry type classification
   */
  private _determineEntryType(ticker: string): string {
    const watchLists = this.categoryManager.getWatchCategory(2);

    if (watchLists.has(ticker)) {
      return 'set';
    }

    if (this._isInResultCategories(watchLists, ticker)) {
      return 'result';
    }

    return 'rejected';
  }

  /**
   * Checks if ticker is in result categories (0, 1, or 4)
   * @private
   * @param watchLists - Lists of categorized watchlists
   * @param ticker - Trading symbol to check
   * @returns True if ticker is in result categories
   */
  private _isInResultCategories(watchLists: Set<string>, ticker: string): boolean {
    return (
      this.categoryManager.getWatchCategory(0).has(ticker) ||
      this.categoryManager.getWatchCategory(1).has(ticker) ||
      this.categoryManager.getWatchCategory(4).has(ticker)
    );
  }

  /**
   * Appends reason to entry type if provided
   * @private
   * @param type - Base entry type
   * @param reason - Optional reason for the entry
   * @returns Combined type and reason
   */
  private _appendReason(type: string, reason: string): string {
    if (reason && reason !== '' && reason !== 'Cancel') {
      return `${type}.${reason}`;
    }
    return type;
  }
}
