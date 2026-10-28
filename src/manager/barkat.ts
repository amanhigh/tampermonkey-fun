import { IBarkatClient } from '../client/barkat';
import { BarkatTickerAnalysis } from '../models/barkat';
import { TickerType } from '../models/ticker';
import { TickerArea, TickerVisibility } from '../models/dom';
import { DomainEventType } from '../models/domain_event';
import { Notifier } from '../util/notify';
import { IDomManager } from './dom';
import { IDomainEventConsumer, ISubscriber } from './event_bus';
import { ITickerManager } from './ticker';

/**
 * Manager for the Barkat API surface used by this userscript.
 * Analysis reads are a pure pass-through; watchlist warm-up resolves the
 * native ticker names from existing ticker metadata before submitting.
 */
export interface IBarkatManager extends IDomainEventConsumer {
  /**
   * Get the multi-timeframe analysis for a ticker.
   * No caching, event publication or policy evaluation happens here.
   * @param ticker - Native ticker symbol, no exchange prefix (e.g. "BRK.B")
   * @returns Promise resolving to the analysis payload
   */
  getTickerAnalysis(ticker: string): Promise<BarkatTickerAnalysis>;
}

/** Manager over the Barkat client with watchlist-driven warm-up resolution. */
export class BarkatManager implements IBarkatManager {
  /**
   * Creates an instance of BarkatManager.
   * @param barkatClient - Barkat API client
   * @param tickerManager - Primary ticker manager used to resolve native symbols
   * @param domManager - DOM manager used to read the current watchlist snapshot
   */
  constructor(
    private readonly barkatClient: IBarkatClient,
    private readonly tickerManager: ITickerManager,
    private readonly domManager: IDomManager
  ) {}

  /** @inheritdoc */
  async getTickerAnalysis(ticker: string): Promise<BarkatTickerAnalysis> {
    return this.barkatClient.getTickerAnalysis(ticker);
  }

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    // The event bus owns rejection logging; failures are not handled here.
    subscriber.subscribeMany(
      [DomainEventType.FIRST_LOAD, DomainEventType.WATCHLIST_CHANGED, DomainEventType.TIMER],
      async () => {
        await this.warmupWatchlist();
      }
    );
  }

  /**
   * Warm up backend coverage for the equity tickers in the current watchlist.
   * The DOM snapshot is read at call time, so event deltas are never trusted.
   * Reads the equity ticker metadata, keeps only records whose native ticker is
   * present in the DOM snapshot, de-duplicates them and submits the result to
   * the backend. An empty snapshot or an empty match submits nothing.
   * Nothing is cached or retried: each trigger is handled on its own, and this
   * manager owns no scheduler — the timer that publishes TIMER lives elsewhere.
   */
  private async warmupWatchlist(): Promise<void> {
    const snapshot = this.domManager.getTickers(TickerArea.WATCHLIST, TickerVisibility.ALL);

    if (snapshot.size === 0) {
      return;
    }

    const equities = await this.tickerManager.listTickers({ type: TickerType.EQUITY });

    const batch = new Set<string>();
    for (const equity of equities) {
      if (snapshot.has(equity.ticker)) {
        batch.add(equity.ticker);
      }
    }

    if (batch.size === 0) {
      return;
    }

    await this.barkatClient.warmupTickers([...batch]);
    Notifier.success(`🔥 Warmed up ${batch.size} ticker(s)`);
  }
}
