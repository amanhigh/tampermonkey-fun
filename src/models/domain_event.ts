/**
 * Enum for domain event types used across the application.
 * These are in-process events that trigger side effects / UI refreshes.
 */
export enum DomainEventType {
  ALERT_TICKER_LINKED = 'ALERT_TICKER_LINKED',
  TICKER_MARKED_RECENT = 'TICKER_MARKED_RECENT',
}

/**
 * Central union of all domain event types.
 * Add new event interfaces to the union when expanding.
 */
import type { AlertTickerLinkedEvent } from './alert_ticker';
import type { TickerMarkedRecentEvent } from './ticker';

export type { AlertTickerLinkedEvent, TickerMarkedRecentEvent };

export type DomainEvent =
  | AlertTickerLinkedEvent
  | TickerMarkedRecentEvent;
