/**
 * Enum for domain event types used across the application.
 * These are in-process events that trigger side effects / UI refreshes.
 */
export enum DomainEventType {
  ALERT_TICKER_LINKED = 'ALERT_TICKER_LINKED',
  ALERT_TICKER_DELETED = 'ALERT_TICKER_DELETED',
  TICKER_MARKED_RECENT = 'TICKER_MARKED_RECENT',
  TICKER_TRACKING_STARTED = 'TICKER_TRACKING_STARTED',
  TICKER_TRACKING_STOPPED = 'TICKER_TRACKING_STOPPED',
  TICKER_CATEGORY_CHANGED = 'TICKER_CATEGORY_CHANGED',
  WATCHLIST_CHANGED = 'WATCHLIST_CHANGED',
}

/**
 * Central union of all domain event types.
 * Add new event interfaces to the union when expanding.
 */
import type { AlertTickerLinkedEvent, AlertTickerDeletedEvent } from './alert_ticker';
import type {
  TickerMarkedRecentEvent,
  TickerTrackingStartedEvent,
  TickerTrackingStoppedEvent,
  TickerCategoryChangedEvent,
} from './ticker';
import type { WatchlistChangedEvent } from './watch';

export type { AlertTickerLinkedEvent, AlertTickerDeletedEvent };
export type {
  TickerMarkedRecentEvent,
  TickerTrackingStartedEvent,
  TickerTrackingStoppedEvent,
  TickerCategoryChangedEvent,
};
export type { WatchlistChangedEvent };

export type DomainEvent =
  | AlertTickerLinkedEvent
  | AlertTickerDeletedEvent
  | TickerMarkedRecentEvent
  | TickerTrackingStartedEvent
  | TickerTrackingStoppedEvent
  | TickerCategoryChangedEvent
  | WatchlistChangedEvent;
