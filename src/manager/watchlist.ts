import { Constants } from '../models/constant';
import { TickerArea, TickerVisibility } from '../models/dom';
import { IPaintManager } from './paint';
import { ICategoryManager } from './category';
import { IPublisher } from './event_bus';
import { IDomManager } from './dom';
import { DomainEventType } from '../models/domain_event';

/**
 * Interface for managing TradingView watchlist operations.
 * Ticker retrieval and painting are delegated to DomManager and PaintManager.
 * This interface only handles watchlist persistence, painting, diffing,
 * and WATCHLIST_CHANGED publication. Summary/label refresh is handled
 * by the caller (WatchListHandler) via WatchlistBar.
 */
export interface ITradingViewWatchlistManager {
  /**
   * Refreshes watchlist UI: layout reset, ticker paint, and diff publication.
   * Does NOT refresh summary labels — caller must refresh the bar separately.
   */
  refresh(): Promise<void>;

  /**
   * Targeted refresh for specific tickers that need repainting (category change,
   * timeframe change, metadata change, etc). Always repaints tickers.
   * @param tickers - Ticker symbols to repaint
   * @returns true after painting a non-empty list, false for an empty list.
   */
  refreshTickers(tickers: string[]): Promise<boolean>;

  /**
   * Targeted refresh driven by observed DOM change.
   * Computes the actual added/removed tickers from the previous snapshot
   * vs current DOM. For a single ticker change, performs a targeted
   * refresh (paintTickers). For zero or multiple changes, falls back
   * to full refresh().
   * @returns true after baseline/full/single/multiple membership refreshes;
   *          false when the snapshot shows no membership changes.
   */
  refreshChangedTickers(): Promise<boolean>;
}

/**
 * Manages TradingView watchlist refresh orchestration, ticker diffing,
 * DOM silo persistence, and WATCHLIST_CHANGED event publishing.
 * Summary/label refresh is delegated to the caller (WatchListHandler).
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
    private readonly domManager: IDomManager,
    private readonly publisher: IPublisher
  ) {}

  // ── Public refresh API ──

  /** @inheritdoc */
  async refresh(): Promise<void> {
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

    this.publishWatchlistChanged(changedTickers);
  }

  /** @inheritdoc */
  async refreshTickers(tickers: string[]): Promise<boolean> {
    if (tickers.length === 0) {
      return false;
    }

    await this.paintManager.paintTickers(tickers);
    return true;
  }

  /** @inheritdoc */
  async refreshChangedTickers(): Promise<boolean> {
    // Fall back to full refresh if baseline has not been established
    if (this.prevWatchlistTickers === null) {
      await this.refresh();
      return true;
    }

    const currentTickers = this.getCurrentWatchlistTickers();
    await this.saveWatchlistSilo(currentTickers);

    const diff = this.diffWatchlistTickers(this.prevWatchlistTickers, currentTickers);

    if (diff.changedTickers.length === 0) {
      // No membership change — just update snapshot
      this.updateSnapshot(currentTickers);
      return false;
    }

    this.updateSnapshot(currentTickers);

    if (diff.changedTickers.length === 1) {
      // Targeted refresh for a single confirmed change
      await this.clearRemovedReadyState(diff.removedTickers);
      await this.paintManager.paintTickers(diff.changedTickers);
      this.publishWatchlistChanged(diff.changedTickers);
      return true;
    }

    // Multiple changes — fall back to full refresh
    await this.paintManager.paint();
    this.publishWatchlistChanged(diff.changedTickers);
    return true;
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
