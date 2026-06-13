import { LRUCache } from 'lru-cache';
import { ITickerClient } from '../client/ticker';
import { Constants } from '../models/constant';
import { IDomainEventPublisher } from './event_bus';
import { DomainEventType } from '../models/domain_event_type';

/**
 * Interface for managing recent ticker data operations.
 * Backed by TickerClient — reads/writes Ticker.last_opened_at.
 */
export interface IRecentManager {
  /**
   * Record ticker as recently opened. Updates cache + backend.
   * @param tvTicker Ticker to record
   */
  markRecent(tvTicker: string): void;

  /**
   * Check if ticker was opened within cutOffPeriod ms.
   * Resolves from LRU cache — on miss, fetches from backend.
   * @param tvTicker Ticker to check
   * @param cutOffPeriod Max age in ms to be considered recent
   */
  isRecent(tvTicker: string, cutOffPeriod: number): Promise<boolean>;
}

/**
 * Manages recent ticker data loaded from the Kohan backend.
 * Uses an LRU cache with on-demand fetch — no pre-load on construction.
 * Writes update cache immediately + fire async to backend.
 */
export class RecentManager implements IRecentManager {
  private readonly cache = new LRUCache<string, number>({
    max: Constants.CACHE.CATEGORY.MAX,
    ttl: Constants.RECENT_CUTOFF_MS,
    fetchMethod: async (key: string): Promise<number | undefined> => {
      try {
        const ticker = await this.client.getTicker(key);
        if (ticker?.last_opened_at) {
          return new Date(ticker.last_opened_at).getTime();
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
  });

  /**
   * Creates a new RecentManager.
   * No cache pre-load — entries are fetched on-demand.
   * @param client - TickerClient for backend API calls
   * @param eventPublisher - Publisher for domain events
   */
  constructor(
    private readonly client: ITickerClient,
    private readonly eventPublisher: IDomainEventPublisher
  ) {}

  /** @inheritdoc */
  public markRecent(tvTicker: string): void {
    const now = Date.now();
    this.cache.set(tvTicker, now);
    void this.client
      .patchTickerLastOpened(tvTicker, {
        last_opened_at: new Date(now).toISOString(),
      })
      .catch(() => {
        // Silently fail — cache still has the latest timestamp
      });
  }

  /** @inheritdoc */
  public async isRecent(tvTicker: string, cutOffPeriod: number): Promise<boolean> {
    const timestamp = await this.cache.fetch(tvTicker);
    if (timestamp === undefined) {
      return false;
    }
    return Date.now() - timestamp <= cutOffPeriod;
  }
}
