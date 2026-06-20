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

  /** @inheritdoc */
  async refresh(): Promise<void> {
    this.filterManager.resetWatchList();

    // Detect tickers added or removed from DOM watchlist (skip on first baseline call)
    const currentTickers = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);

    // Persist current watchlist to shared silo so cross-page consumers (e.g. DisplayManager
    // on the Investing alert feed page) can read ticker membership without TradingView DOM.
    await this.saveWatchlistSilo(currentTickers);

    let changedTickers: string[] = [];
    if (this.prevWatchlistTickers !== null) {
      const removedTickers = [...this.prevWatchlistTickers].filter((t) => !currentTickers.has(t));
      const addedTickers = [...currentTickers].filter((t) => !this.prevWatchlistTickers!.has(t));
      changedTickers = [...removedTickers, ...addedTickers];
      if (removedTickers.length > 0) {
        await this.categoryManager.clearReadyState(removedTickers);
      }
    }
    this.prevWatchlistTickers = currentTickers;

    // Delegate all ticker painting (symbols, flags, FNO) to PaintManager
    await this.paintManager.paint();

    // Reuse summary + filter refresh
    await this.refreshSummary();

    // Notify subscribers of ticker set changes only when changes exist
    if (changedTickers.length > 0) {
      void this.publisher.publish({
        type: DomainEventType.WATCHLIST_CHANGED,
        tickers: changedTickers,
      });
    }
  }

  /** @inheritdoc */
  async refreshChangedTickers(): Promise<void> {
    // Fall back to full refresh if baseline has not been established
    if (this.prevWatchlistTickers === null) {
      await this.refresh();
      return;
    }

    const currentTickers = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);
    await this.saveWatchlistSilo(currentTickers);

    const prevTickers = this.prevWatchlistTickers!;
    const removedTickers = [...prevTickers].filter((t) => !currentTickers.has(t));
    const addedTickers = [...currentTickers].filter((t) => !prevTickers.has(t));
    const changedTickers = [...removedTickers, ...addedTickers];

    if (changedTickers.length === 0) {
      // No membership change — just update snapshot
      this.prevWatchlistTickers = currentTickers;
      return;
    }

    this.prevWatchlistTickers = currentTickers;

    if (changedTickers.length === 1) {
      // Targeted refresh for a single confirmed change
      if (removedTickers.length > 0) {
        await this.categoryManager.clearReadyState(removedTickers);
      }

      await this.paintManager.paintTickers(changedTickers);
      await this.refreshSummary();

      void this.publisher.publish({
        type: DomainEventType.WATCHLIST_CHANGED,
        tickers: changedTickers,
      });
      return;
    }

    // Multiple changes — fall back to full refresh
    await this.paintManager.paint();
    await this.refreshSummary();

    void this.publisher.publish({
      type: DomainEventType.WATCHLIST_CHANGED,
      tickers: changedTickers,
    });
  }

  /** @inheritdoc */
  async refreshTickers(tickers: string[]): Promise<void> {
    if (tickers.length === 0) {
      return;
    }

    await this.paintManager.paintTickers(tickers);
    await this.refreshSummary();
  }

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
