import { JournalType } from '../models/trading';
import { ISequenceManager } from './sequence';
import { Notifier } from '../util/notify';
import { IKohanClient } from '../client/kohan';
import { ITimeFrameManager } from './timeframe';
import { CreateJournalInput, CreateJournalRequest, JournalRecord, ScreenshotResponse } from '../models/kohan';

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
   * Creates a journal through the new Journal API.
   * @param input Journal creation input
   * @returns Promise resolving with created journal data
   */
  createJournal(input: CreateJournalInput): Promise<JournalRecord>;

  /**
   * Takes screenshots for the given ticker using the configured sequence order.
   * @param ticker Trading symbol to capture
   * @param type Screenshot purpose/type used in filenames
   * @returns Promise resolving with screenshot metadata
   */
  screenshotTicker(ticker: string, type: string): Promise<ScreenshotResponse[]>;

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

  /** @inheritdoc */
  public async createJournal(input: CreateJournalInput): Promise<JournalRecord> {
    const request: CreateJournalRequest = {
      ticker: input.ticker.toUpperCase(),
      sequence: this.sequenceManager.getCurrentSequence() as CreateJournalRequest['sequence'],
      type: 'REJECTED',
      status: 'FAIL',
      images: input.screenshots.map((screenshot) => ({
        timeframe: this.extractTimeframe(screenshot.file_name),
        file_name: screenshot.file_name,
      })),
      tags: this.parseReasonTags(input.reason),
    };

    const journal = await this.kohanClient.createJournal(request);
    Notifier.success(`Journal created: ${journal.ticker} ${journal.type} ${journal.status}`);
    return journal;
  }

  /**
   * Takes screenshots for a journal using the sequence-defined timeframe order.
   * @param ticker Trading symbol to capture
   * @param type Screenshot purpose/type used in filenames
   * @returns Promise resolving with screenshot metadata
   */
  public async screenshotTicker(ticker: string, type: string): Promise<ScreenshotResponse[]> {
    const sequence = this.sequenceManager.getCurrentSequence();
    const screenshots: ScreenshotResponse[] = [];
    const screenshotType = type.toLowerCase();

    for (const position of [0, 1, 2, 3]) {
      this.timeframeManager.applyTimeFrame(position);
      const timeframe = this.sequenceManager.sequenceToTimeFrameConfig(sequence, position).symbol;
      const order = position + 1;

      const fileName = `${ticker.toUpperCase()}_${this.getScreenshotTimestamp()}_${order}_${timeframe.toLowerCase()}_${screenshotType}.png`;
      const screenshot = await this.kohanClient.screenshot({
        file_name: fileName,
        save_path: '/home/aman/Pictures',
        type: 'FULL',
        window: 'TradingView',
      });
      screenshots.push(screenshot);
    }

    return screenshots;
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

  private getScreenshotTimestamp(): string {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return `${date}_${time}`;
  }

  private extractTimeframe(fileName: string): 'DL' | 'WK' | 'MN' | 'TMN' | 'SMN' | 'YR' {
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
    const parts = nameWithoutExt.split('_');
    const timeframe = parts[parts.length - 2]?.toUpperCase();
    return (timeframe === 'D' ? 'DL' : timeframe) as 'DL' | 'WK' | 'MN' | 'TMN' | 'SMN' | 'YR';
  }

  private parseReasonTags(reason: string): CreateJournalRequest['tags'] {
    if (!reason) {
      return undefined;
    }

    const [tag, ...overrideParts] = reason.split('-');
    const override = overrideParts.join('-');

    return [
      {
        tag,
        type: 'REASON',
        ...(override ? { override } : {}),
      },
    ];
  }
}
