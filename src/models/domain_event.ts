/**
 * Enum for domain event types used across the application.
 * These are in-process events that trigger side effects / UI refreshes.
 */
export enum DomainEventType {
  ALERT_TICKER_LINKED = 'ALERT_TICKER_LINKED',
  ALERT_TICKER_DELETED = 'ALERT_TICKER_DELETED',
  TICKER_TRACKING_STARTED = 'TICKER_TRACKING_STARTED',
  TICKER_TRACKING_STOPPED = 'TICKER_TRACKING_STOPPED',
  TICKER_CATEGORY_CHANGED = 'TICKER_CATEGORY_CHANGED',
  WATCHLIST_CHANGED = 'WATCHLIST_CHANGED',
  TICKER_TIMEFRAMES_CHANGED = 'TICKER_TIMEFRAMES_CHANGED',
  TICKER_CHANGED = 'TICKER_CHANGED',
}

// ── Reusable Payload Interfaces ──

/**
 * Payload containing a single TV/backend ticker string.
 */
export interface TickerPayload {
  ticker: string;
}

/**
 * Payload containing multiple ticker strings (for batch events).
 */
export interface TickersPayload {
  tickers: string[];
}

/**
 * Payload containing a TV ticker (optional) and an Investing.com alert ticker symbol.
 * ticker is optional because ALERT_TICKER_DELETED may not know the parent TV ticker.
 */
export interface AlertTickerPayload {
  /** Investing.com symbol (string, not full AlertTicker record). */
  alertTicker: string;
  /** Associated TV ticker (optional — omitted when the parent ticker is unknown). */
  ticker?: string;
}

// ── Event Base Interface ──

export interface DomainEventBase<TType extends DomainEventType = DomainEventType> {
  type: TType;
}

// ── Event Interface Aliases ──

export interface AlertTickerLinkedEvent
  extends DomainEventBase<DomainEventType.ALERT_TICKER_LINKED>, AlertTickerPayload {}

export interface AlertTickerDeletedEvent
  extends DomainEventBase<DomainEventType.ALERT_TICKER_DELETED>, AlertTickerPayload {}

export interface TickerTrackingStartedEvent
  extends DomainEventBase<DomainEventType.TICKER_TRACKING_STARTED>, TickerPayload {}

export interface TickerTrackingStoppedEvent
  extends DomainEventBase<DomainEventType.TICKER_TRACKING_STOPPED>, TickerPayload {}

export interface TickerCategoryChangedEvent
  extends DomainEventBase<DomainEventType.TICKER_CATEGORY_CHANGED>, TickersPayload {}

export interface WatchlistChangedEvent extends DomainEventBase<DomainEventType.WATCHLIST_CHANGED>, TickerPayload {}

export interface TickerTimeframesChangedEvent
  extends DomainEventBase<DomainEventType.TICKER_TIMEFRAMES_CHANGED>, TickerPayload {}

export interface TickerChangedEvent extends DomainEventBase<DomainEventType.TICKER_CHANGED>, TickerPayload {}

// ── Event-by-Type Map ──

/**
 * One-to-one mapping from event type string to its event interface.
 * Used instead of Extract<DomainEvent, { type: T }> to avoid
 * TypeScript 6.0.3 `never` resolution issues with string enums.
 */
export interface DomainEventByType {
  [DomainEventType.ALERT_TICKER_LINKED]: AlertTickerLinkedEvent;
  [DomainEventType.ALERT_TICKER_DELETED]: AlertTickerDeletedEvent;
  [DomainEventType.TICKER_TRACKING_STARTED]: TickerTrackingStartedEvent;
  [DomainEventType.TICKER_TRACKING_STOPPED]: TickerTrackingStoppedEvent;
  [DomainEventType.TICKER_CATEGORY_CHANGED]: TickerCategoryChangedEvent;
  [DomainEventType.WATCHLIST_CHANGED]: WatchlistChangedEvent;
  [DomainEventType.TICKER_TIMEFRAMES_CHANGED]: TickerTimeframesChangedEvent;
  [DomainEventType.TICKER_CHANGED]: TickerChangedEvent;
}

// ── Event Union ──

export type DomainEvent =
  | AlertTickerLinkedEvent
  | AlertTickerDeletedEvent
  | TickerTrackingStartedEvent
  | TickerTrackingStoppedEvent
  | TickerCategoryChangedEvent
  | WatchlistChangedEvent
  | TickerTimeframesChangedEvent
  | TickerChangedEvent;
