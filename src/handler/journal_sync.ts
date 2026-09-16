/**
 * Interface and implementations for journal synchronization
 */

import { IJournalManager } from '../manager/journal';
import { IDomManager } from '../manager/dom';
import { Constants } from '../models/constant';
import { JournalOpenEvent } from '../models/events';

/**
 * Interface for handling journal synchronization
 */
export interface IJournalSyncHandler {
  /**
   * Detects a journal page URL on the localhost host and publishes the journal-open event so TradingView opens the chart.
   */
  publishBarkatJournalOpen(): void;

  /**
   * Publishes that a journal was recorded on TradingView so the localhost host opens its review page.
   */
  publishTvJournalRecorded(journalId: string): Promise<void>;

  /**
   * Registers the TradingView listener for the journal-open event published by the Barkat host.
   */
  registerBarkatJournalOpenListener(): void;

  /**
   * Registers the localhost listener for the journal-open event published by TradingView.
   */
  registerTvJournalRecordedListener(): void;
}

/**
 * Handles journal synchronization between Barkat and TradingView
 */
export class JournalSyncHandler implements IJournalSyncHandler {
  constructor(
    private readonly journalManager: IJournalManager,
    private readonly domManager: IDomManager
  ) {}

  // ── Sync Publisher ──

  /** @inheritdoc */
  public publishBarkatJournalOpen(): void {
    const journalMatch = window.location.pathname.match(/^\/journal\/([^/]+)$/);
    if (!journalMatch) {
      return;
    }

    const journalId = journalMatch[1];
    void this.journalManager.publishJournalOpenedEvent(journalId);
  }

  /** @inheritdoc */
  public async publishTvJournalRecorded(journalId: string): Promise<void> {
    await this.journalManager.publishJournalOpenEvent(journalId).catch((error) => {
      throw new Error(`Failed to publish journal open event: ${error}`);
    });
  }

  // ── Sync Consumer ──

  /** @inheritdoc */
  public registerBarkatJournalOpenListener(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.JOURNAL_OPENED,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        if (typeof newValue === 'string' && newValue.trim()) {
          let event: JournalOpenEvent;
          try {
            event = JournalOpenEvent.fromString(newValue);
          } catch {
            console.warn('[JournalSync][TradingView] Ignoring malformed journalOpenedEvent value', { newValue });
            return;
          }

          if (typeof event.journalId !== 'string' || !event.journalId.trim()) {
            console.warn('[JournalSync][TradingView] Ignoring journalOpenedEvent with empty journal id', { newValue });
            return;
          }

          this.handleBarkatJournalOpen(event.journalId);
        } else {
          console.warn('[JournalSync][TradingView] Ignoring invalid journalOpenedEvent value', { newValue });
        }
      }
    );
  }

  /** Opens the chart for the journal announced by the Barkat host. */
  private handleBarkatJournalOpen(journalId: string): void {
    const normalizedJournalId = journalId.trim();
    if (!normalizedJournalId) {
      return;
    }

    void this.openJournalTicker(normalizedJournalId);
  }

  private async openJournalTicker(journalId: string): Promise<void> {
    try {
      const journal = await this.journalManager.getJournal(journalId);
      await this.domManager.openTicker(journal.ticker);
    } catch (error) {
      console.error('[JournalSync][TradingView] Failed to open journal', {
        journalId,
        error: (error as Error).message,
      });
    }
  }

  /** @inheritdoc */
  public registerTvJournalRecordedListener(): void {
    GM_addValueChangeListener(
      Constants.STORAGE.EVENTS.JOURNAL_OPEN,
      (_keyName: string, _oldValue: unknown, newValue: unknown) => {
        if (newValue && typeof newValue === 'string') {
          const journalOpenEvent = JournalOpenEvent.fromString(newValue);
          this.handleTvJournalRecorded(journalOpenEvent.journalId);
        }
      }
    );
  }

  /** Navigates to the journal review page after a journal was recorded on TradingView. */
  private handleTvJournalRecorded(journalId: string): void {
    const normalizedJournalId = journalId.trim();
    if (!normalizedJournalId) {
      return;
    }

    window.location.replace(`/journal/${normalizedJournalId}`);
  }
}
