import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { IPaintManager } from './paint';
import { ICategoryManager } from './category';
import type { IFilterManager } from './filter';
import { IPublisher } from './event_bus';
import { IDomManager } from './dom';
import { DomainEventType } from '../models/domain_event';

/**
 * Interface for managing TradingView watchlist operations.
 * Ticker retrieval and painting are delegated to DomManager and PaintManager.
 * Summary/filter rendering is delegated to FilterManager.
 * This interface only handles watchlist-specific orchestration.
 */
export interface ITradingViewWatchlistManager {
  /**
   * Refreshes watchlist UI: layout reset, ticker paint, summary labels, filters.
   */
  refresh(): Promise<void>;

  /**
   * Targeted refresh for specific tickers that need repainting (category change,
   * timeframe change, metadata change, etc). Always repaints tickers AND
   * refreshes summary/filters together.
   * @param tickers - Ticker symbols to repaint
   */
  refreshTickers(tickers: string[]): Promise<void>;

  /**
   * Targeted refresh driven by observed DOM change.
   * Computes the actual added/removed tickers from the previous snapshot
   * vs current DOM. For a single ticker change, performs a targeted
   * refresh (paintTickers). For zero or multiple changes, falls back
   * to full refresh().
   */
  refreshChangedTickers(): Promise<void>;
}

/**
 * Manages TradingView watchlist refresh orchestration, ticker diffing,
 * DOM silo persistence, and WATCHLIST_CHANGED event publishing.
 * UI rendering (layout reset, summary labels, filters) is delegated
 * to FilterManager.
 */
export class TradingViewWatchlistManager implements ITradingViewWatchlistManager {
  /**
   * Snapshot of the watchlist ticker set from the previous refresh cycle.
   * Used to detect tickers removed from the DOM watchlist.
   * null on first call (skip removal detection for baseline).
   * @private
   */
  private prevWatchlistTickers: Set<string> | null = null;

  constructor(
    private readonly paintManager: IPaintManager,
    private readonly categoryManager: ICategoryManager,
    private readonly filterManager: IFilterManager,
    private readonly domManager: IDomManager,
    private readonly publisher: IPublisher
  ) {}

  // ── Public refresh API ──

  /** @inheritdoc */
  async refresh(): Promise<void> {
    this.filterManager.resetWatchList();

    const currentTickers = this.getCurrentWatchlistTickers();
    await this.saveWatchlistSilo(currentTickers);

    let changedTickers: string[] = [];
    if (this.prevWatchlistTickers !== null) {
      const diff = this.diffWatchlistTickers(this.prevWatchlistTickers, currentTickers);
      changedTickers = diff.changedTickers;
      await this.clearRemovedReadyState(diff.removedTickers);
    }
    this.updateSnapshot(currentTickers);

    // Delegate all ticker painting (symbols, flags, FNO) to PaintManager
    await this.paintManager.paint();

    await this.refreshSummary();
    this.publishWatchlistChanged(changedTickers);
  }

  /** @inheritdoc */
  async refreshTickers(tickers: string[]): Promise<void> {
    if (tickers.length === 0) {
      return;
    }

    await this.paintManager.paintTickers(tickers);
    await this.refreshSummary();
  }

  /** @inheritdoc */
  async refreshChangedTickers(): Promise<void> {
    // Fall back to full refresh if baseline has not been established
    if (this.prevWatchlistTickers === null) {
      await this.refresh();
      return;
    }

    const currentTickers = this.getCurrentWatchlistTickers();
    await this.saveWatchlistSilo(currentTickers);

    const diff = this.diffWatchlistTickers(this.prevWatchlistTickers, currentTickers);

    if (diff.changedTickers.length === 0) {
      // No membership change — just update snapshot
      this.updateSnapshot(currentTickers);
      return;
    }

    this.updateSnapshot(currentTickers);

    if (diff.changedTickers.length === 1) {
      // Targeted refresh for a single confirmed change
      await this.clearRemovedReadyState(diff.removedTickers);
      await this.paintManager.paintTickers(diff.changedTickers);
      await this.refreshSummary();
      this.publishWatchlistChanged(diff.changedTickers);
      return;
    }

    // Multiple changes — fall back to full refresh
    await this.paintManager.paint();
    await this.refreshSummary();
    this.publishWatchlistChanged(diff.changedTickers);
  }

  // ── Snapshot and diff helpers ──

  /**
   * Retrieve the current watchlist ticker set from the DOM.
   */
  private getCurrentWatchlistTickers(): Set<string> {
    return this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);
  }

  /**
   * Compute removed, added, and changed tickers between two snapshots.
   * @returns Object with removedTickers, addedTickers, and changedTickers arrays.
   */
  private diffWatchlistTickers(
    previous: Set<string>,
    current: Set<string>
  ): { removedTickers: string[]; addedTickers: string[]; changedTickers: string[] } {
    const removedTickers = [...previous].filter((t) => !current.has(t));
    const addedTickers = [...current].filter((t) => !previous.has(t));
    const changedTickers = [...removedTickers, ...addedTickers];
    return { removedTickers, addedTickers, changedTickers };
  }

  /**
   * Update the persisted snapshot to the current ticker set.
   */
  private updateSnapshot(currentTickers: Set<string>): void {
    this.prevWatchlistTickers = currentTickers;
  }

  // ── Refresh helpers ──

  /**
   * Recompute bucket counts and refresh summary labels + filters.
   * Internal — callers should use refreshTickers() or rely on refresh()
   * / refreshChangedTickers() to call this automatically.
   */
  private async refreshSummary(): Promise<void> {
    // Recompute bucket counts without repainting DOM
    const result = await this.paintManager.summarizeBuckets();

    // Delegate UI rendering (labels + filters) to FilterManager
    this.filterManager.refreshSummary(result);
  }

  /**
   * Clear READY state for tickers that have been removed from the watchlist.
   * No-ops when the removed list is empty.
   */
  private async clearRemovedReadyState(removedTickers: string[]): Promise<void> {
    if (removedTickers.length > 0) {
      await this.categoryManager.clearReadyState(removedTickers);
    }
  }

  // ── Event helpers ──

  /**
   * Publish WATCHLIST_CHANGED event for the given changed tickers.
   * No-ops when the list is empty.
   */
  private publishWatchlistChanged(changedTickers: string[]): void {
    if (changedTickers.length > 0) {
      void this.publisher.publish({
        type: DomainEventType.WATCHLIST_CHANGED,
        tickers: changedTickers,
      });
    }
  }

  // ── Persistence ──

  /**
   * Persist current watchlist ticker set to shared GM silo so cross-page
   * consumers (e.g. DisplayManager on the Investing alert feed page) can
   * read ticker membership without relying on TradingView DOM presence.
   */
  private async saveWatchlistSilo(tickers: Set<string>): Promise<void> {
    await GM.setValue(
      Constants.STORAGE.SILOS.WATCHLIST,
      JSON.stringify({
        tickers: [...tickers],
        updatedAt: new Date().toISOString(),
      })
    );
  }
}
