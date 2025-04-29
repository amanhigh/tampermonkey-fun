import { JournalType } from '../models/trading';
import { ISequenceManager } from './sequence';
import { Notifier } from '../util/notify';
import { IKohanClient } from '../client/kohan';
import { ITimeFrameManager } from './timeframe';

/**
 * Interface for managing trading journal operations
 */
export interface IJournalManager {
  /**
   * Creates a journal entry tag used for naming trading journal images
   * Creates a journal entry tag used for naming trading journal images
   * Format: TICKER.SEQUENCE.TYPE.REASON
   * Example: "HGS.yr.rejected.oe"
   *
   * Flow:
   * 1. TICKER: Trading symbol (e.g., "HGS")
   * 2. SEQUENCE: Lowercased sequence from current sequence (e.g., "YR" -> "yr")
   * 3. TYPE: Based on ticker's category:
   *    - "set" if ticker in category 2
   *    - "result" if ticker in categories 0,1,4
   *    - "rejected" otherwise
   * 4. REASON: Trading reason code if provided (e.g., "oe")
   *
   * @param ticker - Trading symbol to create entry for
   * @param type - Journal entry type
   * @param reason - Optional trading reason code
   * @returns Formatted journal tag (e.g., "HGS.yr.rejected.oe")
   */
  createEntry(ticker: string, type: JournalType, reason: string): Promise<void>;

  /**
   * Creates formatted text combining symbol and reason for clipboard copying
   * @param reason - Trading reason code
   * @returns Formatted text (e.g., "HGS - oe")
   */
  createReasonText(reason: string): string;
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
    private readonly sequenceManager: ISequenceManager,
    private readonly kohanClient: IKohanClient,
    private readonly timeframeManager: ITimeFrameManager
  ) {}

  /** @inheritdoc */
  public async createEntry(ticker: string, type: JournalType, reason: string): Promise<void> {
    const journalTag = this.createJournalTag(ticker, type, reason);
    await this.kohanClient.recordTicker(journalTag);
    Notifier.success(`Journal entry created: ${journalTag}`);
  }

  /**
   * Creates a journal entry tag used for naming trading journal images
   * @private
   */
  private createJournalTag(ticker: string, type: JournalType, reason: string): string {
    const sequence = this.sequenceManager.getCurrentSequence().toLowerCase();

    const parts = [ticker, sequence, type.toString()];

    if (reason && reason !== '' && reason !== 'Cancel') {
      parts.push(reason);
    }

    return parts.join('.');
  }

  /** @inheritdoc */
  createReasonText(reason: string): string {
    const timeframe = this.timeframeManager.getCurrentTimeFrameConfig().symbol;
    return `${timeframe} - ${reason}`;
  }
}
