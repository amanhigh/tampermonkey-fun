import { ISequenceManager } from './sequence';
import { Notifier } from '../util/notify';
import { IKohanClient } from '../client/kohan';
import { ITimeFrameManager } from './timeframe';
import {
  CreateJournalImageRequest,
  CreateJournalInput,
  CreateJournalRequest,
  CreateJournalTagRequest,
  JournalApiTimeframe,
  JournalRecord,
  JournalResultStatus,
  ScreenshotResponse,
} from '../models/kohan';
import { Constants } from '../models/constant';
import { JournalOpenEvent } from '../models/events';

/**
 * Interface for managing trading journal operations
 */
export interface IJournalManager {
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
   * Captures a single region screenshot for the trade checklist image.
   * Uses the top timeframe config for image metadata but labels the file as checklist.
   * @param ticker Trading symbol to capture
   * @param type Screenshot purpose/type used in filenames
   * @returns Promise resolving with checklist screenshot metadata
   */
  screenshotChecklist(ticker: string, type: string): Promise<ScreenshotResponse>;

  /**
   * Finds the latest TAKEN/RUNNING journal for a ticker.
   * @param ticker Trading symbol to search for
   * @returns Promise resolving with the running journal or null if none found
   */
  findRunningJournal(ticker: string): Promise<JournalRecord | null>;

  /**
   * Appends screenshots as images to an existing journal.
   * @param journalId Journal external ID
   * @param screenshots Captured screenshots to add
   */
  addJournalImages(journalId: string, screenshots: ScreenshotResponse[]): Promise<void>;

  /**
   * Adds parsed reason tags to an existing journal. Skips empty reasons.
   * @param journalId Journal external ID
   * @param reason Reason string to parse into tags
   */
  addReasonTags(journalId: string, reason: string): Promise<void>;

  /**
   * Updates a journal's status to a result status.
   * @param journalId Journal external ID
   * @param status Result status to set
   */
  updateJournalStatus(journalId: string, status: JournalResultStatus): Promise<void>;

  /**
   * Creates formatted text combining symbol and reason for clipboard copying
   * @param reason - Trading reason code
   * @returns Formatted text (e.g., "HGS - oe")
   */
  createReasonText(reason: string): string;

  /**
   * Publishes an open-journal event for localhost review tabs.
   * @param journalId Created journal identifier
   */
  publishJournalOpenEvent(journalId: string): Promise<void>;
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
  public async createJournal(input: CreateJournalInput): Promise<JournalRecord> {
    const request: CreateJournalRequest = {
      ticker: input.ticker.toUpperCase(),
      sequence: this.sequenceManager.getCurrentSequence() as CreateJournalRequest['sequence'],
      type: input.type,
      status: input.status,
      images: input.screenshots.map((screenshot) => ({
        timeframe: screenshot.timeframe as JournalApiTimeframe,
        file_name: screenshot.file_name,
      })),
      tags: this.toReasonTagRequest(input.reason),
      notes: input.notes,
    };

    const journal = await this.kohanClient.createJournal(request);
    Notifier.success(`Journal created: ${journal.ticker} ${journal.type} ${journal.status}`);
    return journal;
  }

  /** @inheritdoc */
  public async findRunningJournal(ticker: string): Promise<JournalRecord | null> {
    try {
      const response = await this.kohanClient.listJournals({
        ticker,
        type: 'TAKEN',
        status: 'RUNNING',
        limit: 5,
        'sort-by': 'created_at',
        'sort-order': 'desc',
      });

      if (response.journals.length > 1) {
        throw new Error(`Multiple running journals found for ${ticker}. Using the most recent.`);
      }

      return response.journals.length > 0 ? response.journals[0] : null;
    } catch (error) {
      throw new Error(`Failed to find running journal: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  public async addJournalImages(journalId: string, screenshots: ScreenshotResponse[]): Promise<void> {
    for (const screenshot of screenshots) {
      const image: CreateJournalImageRequest = {
        timeframe: screenshot.timeframe as JournalApiTimeframe,
        file_name: screenshot.file_name,
      };
      await this.kohanClient.addJournalImage(journalId, image);
    }
  }

  /** @inheritdoc */
  public async addReasonTags(journalId: string, reason: string): Promise<void> {
    if (!reason) {
      return;
    }

    const tags = this.toReasonTagRequest(reason);
    if (tags) {
      for (const tag of tags) {
        await this.kohanClient.addJournalTag(journalId, tag);
      }
    }
  }

  /** @inheritdoc */
  public async updateJournalStatus(journalId: string, status: JournalResultStatus): Promise<void> {
    await this.kohanClient.updateJournalStatus(journalId, { status });
  }

  /** @inheritdoc */
  public async publishJournalOpenEvent(journalId: string): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.JOURNAL_OPEN, new JournalOpenEvent(journalId).stringify());
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
      const config = this.sequenceManager.sequenceToTimeFrameConfig(sequence, position);
      const timeframe = config.symbol;
      const order = position + 1;

      const fileName = `${ticker.toUpperCase()}_${this.getScreenshotTimestamp()}_${order}_${timeframe.toLowerCase()}_${screenshotType}.png`;
      const screenshot = await this.kohanClient.screenshot({
        file_name: fileName,
        directory_type: 'JOURNAL',
        type: 'FULL',
        window: 'TradingView',
        notify: false,
      });
      screenshot.timeframe = timeframe as JournalApiTimeframe;
      screenshots.push(screenshot);
    }

    return screenshots;
  }

  /** @inheritdoc */
  public async screenshotChecklist(ticker: string, type: string): Promise<ScreenshotResponse> {
    const sequence = this.sequenceManager.getCurrentSequence();
    const screenshotType = type.toLowerCase();

    // Use top timeframe config (position 0) for image metadata
    const config = this.sequenceManager.sequenceToTimeFrameConfig(sequence, 0);
    const timeframe = config.symbol;

    // Build filename: TICKER_YYYYMMDD_HHMM_checklist_type.png
    const fileName = `${ticker.toUpperCase()}_${this.getScreenshotTimestamp()}_checklist_${screenshotType}.png`;

    const screenshot = await this.kohanClient.screenshot({
      file_name: fileName,
      directory_type: 'JOURNAL',
      type: 'REGION',
      notify: false,
    });

    screenshot.timeframe = timeframe as JournalApiTimeframe;
    return screenshot;
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

  private toReasonTagRequest(reason: string): CreateJournalTagRequest[] | undefined {
    if (!reason) {
      return undefined;
    }

    const [tag, ...overrideParts] = reason.split('-');
    const override = overrideParts.join('-');
    const tagRequest = {
      tag,
      type: 'REASON' as const,
      ...(override ? { override } : {}),
    };

    return [tagRequest];
  }
}
