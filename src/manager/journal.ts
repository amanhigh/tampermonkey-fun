import { ITimeFrameManager } from './timeframe';
import { Notifier } from '../util/notify';
import { IJournalClient } from '../client/journal';
import { IOsClient } from '../client/os';
import {
  CreateJournalInput,
  CreateJournalImageRequest,
  CreateJournalRequest,
  CreateJournalTagRequest,
  JournalSequence,
  JournalTimeframe,
  JournalQueryParams,
  JournalRecord,
  JournalResultStatus,
} from '../models/journal';
import { ScreenshotResponse } from '../models/os';
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
   * Takes screenshots for the given ticker using the ticker's applied timeframes.
   * @param ticker Trading symbol to capture
   * @param type Screenshot purpose/type used in filenames
   * @returns Promise resolving with screenshot metadata
   */
  screenshotTicker(ticker: string, type: string): Promise<ScreenshotResponse[]>;

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
   * Lists all journals matching the given query parameters, auto-paginating.
   * @param params Query parameters for filtering journals
   * @returns Promise resolving with all matching journal records
   */
  listJournals(params: JournalQueryParams): Promise<JournalRecord[]>;

  /**
   * Publishes an open-journal event for localhost review tabs.
   * @param journalId Created journal identifier
   */
  publishJournalOpenEvent(journalId: string): Promise<void>;
}

/**
 * Manages trading journal entries and operations.
 *
 * The legacy API `sequence` field is derived from the screenshot timeframe codes
 * using a private helper (currently: contains DL → MWD, else YR).
 * FIXME: Replace with user-prompted or backend-provided type selection.
 */
export class JournalManager implements IJournalManager {
  constructor(
    private readonly journalClient: IJournalClient,
    private readonly osClient: IOsClient,
    private readonly timeframeManager: ITimeFrameManager
  ) {}

  /** @inheritdoc */
  public async createJournal(input: CreateJournalInput): Promise<JournalRecord> {
    const screenshotCodes = input.screenshots
      .map((s) => s.timeframe)
      .filter((t): t is JournalTimeframe => t !== undefined);
    const request: CreateJournalRequest = {
      ticker: input.ticker.toUpperCase(),
      sequence: this.getLegacyJournalSequenceFromTimeframes(screenshotCodes),
      type: input.type,
      status: input.status,
      images: input.screenshots.map((screenshot) => ({
        timeframe: screenshot.timeframe as JournalTimeframe,
        file_name: screenshot.file_name,
      })),
      tags: this.toReasonTagRequest(input.reason),
      notes: input.notes,
    };

    const journal = await this.journalClient.createJournal(request);
    Notifier.success(`Journal created: ${journal.ticker} ${journal.type} ${journal.status}`);
    return journal;
  }

  /** @inheritdoc */
  public async findRunningJournal(ticker: string): Promise<JournalRecord | null> {
    try {
      const response = await this.journalClient.listJournals({
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
        timeframe: screenshot.timeframe as JournalTimeframe,
        file_name: screenshot.file_name,
      };
      await this.journalClient.addJournalImage(journalId, image);
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
        await this.journalClient.addJournalTag(journalId, tag);
      }
    }
  }

  /** @inheritdoc */
  public async updateJournalStatus(journalId: string, status: JournalResultStatus): Promise<void> {
    await this.journalClient.updateJournalStatus(journalId, { status });
    // BUG: Ticker category not evicted / no domain event published.
    // After status flips RUNNING -> SUCCESS/FAIL/MISSED, the watch category cache
    // still returns RUNNING (lime green) until TTL expiry or navigation.
  }

  /** @inheritdoc */
  public async listJournals(params: JournalQueryParams): Promise<JournalRecord[]> {
    // FIXME: Extract auto-pagination (do/while offset<total) into a shared BaseManager helper
    const limit = Constants.KOHAN.PAGE_LIMIT;
    let offset = 0;
    let total = 0;
    const all: JournalRecord[] = [];

    try {
      do {
        const response = await this.journalClient.listJournals({ ...params, limit, offset });
        all.push(...response.journals);
        total = response.metadata.total;
        offset += limit;
      } while (offset < total);

      return all;
    } catch (error) {
      throw new Error(`Failed to list journals: ${(error as Error).message}`);
    }
  }

  /** @inheritdoc */
  public async publishJournalOpenEvent(journalId: string): Promise<void> {
    await GM.setValue(Constants.STORAGE.EVENTS.JOURNAL_OPEN, new JournalOpenEvent(journalId).stringify());
  }

  /**
   * Takes screenshots for a journal using the ticker's applied timeframes.
   * @param ticker Trading symbol to capture
   * @param type Screenshot purpose/type used in filenames
   * @returns Promise resolving with screenshot metadata
   */
  public async screenshotTicker(ticker: string, type: string): Promise<ScreenshotResponse[]> {
    const sequence = await this.timeframeManager.getSequence();
    const screenshots: ScreenshotResponse[] = [];
    const screenshotType = type.toLowerCase();

    for (let position = 0; position < sequence.length; position++) {
      // BUG 3.10: Ignored return value from apply() — when a timeframe is
      // deactivated, apply returns false silently and screenshot proceeds
      // on the wrong timeframe. Must warn user and skip the deactivated position.
      await this.timeframeManager.apply(position);
      const code = sequence[position];
      const order = position + 1;

      const fileName = `${ticker.toUpperCase()}_${this.getScreenshotTimestamp()}_${order}_${code.toLowerCase()}_${screenshotType}.png`;
      const screenshot = await this.osClient.screenshot({
        file_name: fileName,
        directory_type: 'JOURNAL',
        type: 'FULL',
        window: 'TradingView',
        notify: false,
      });
      screenshot.timeframe = code as JournalTimeframe;
      screenshots.push(screenshot);
    }

    return screenshots;
  }

  /** @inheritdoc */
  createReasonText(reason: string): string {
    const timeframe = this.timeframeManager.getCurrentConfig().code;
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

  /**
   * Derives the legacy journal API sequence from a list of screenshot timeframe codes.
   *
   * Rule: if the list contains 'DL', return 'MWD'; otherwise return 'YR'.
   *
   * FIXME: Replace this heuristic with user-prompted selection or backend-provided type.
   */
  private getLegacyJournalSequenceFromTimeframes(timeframes: readonly JournalTimeframe[]): JournalSequence {
    if (timeframes.includes('DL' as JournalTimeframe)) {
      return 'MWD';
    }
    return 'YR';
  }
}
