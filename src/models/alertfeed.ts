import { BaseEvent } from "./events";

/**
 * Enum representing the different states an alert feed item can have:
 * - UNMAPPED: Default starting state, ticker is not mapped to any information
 * - MAPPED: Ticker is mapped to a TradingView symbol but not in any other state
 * - RECENT: Ticker was recently viewed by the user
 * - WATCHED: Ticker is in the user's watchlist
 *
 * State Transition Diagram:
 *   UNMAPPED -> MAPPED -> RECENT
 *                      -> WATCHED
 */
export enum FeedState {
  UNMAPPED = 'UNMAPPED',
  MAPPED = 'MAPPED',
  RECENT = 'RECENT',
  WATCHED = 'WATCHED',
}

/**
 * Interface holding the feed state and corresponding color for an alert feed item
 */
export interface FeedInfo {
  state: FeedState;
  color: string;
}

/**
 * Class representing an alert feed event
 */
export class AlertFeedEvent extends BaseEvent {
  investingTicker: string;
  feedInfo: FeedInfo;

  constructor(investingTicker: string, feedInfo: FeedInfo) {
    super();
    this.investingTicker = investingTicker;
    this.feedInfo = feedInfo;
  }

  /**
   * Parse a stringified alert feed event
   * @param stringifiedEvent The stringified event to parse
   * @returns The parsed alert feed event
   */
  static fromString(stringifiedEvent: string): AlertFeedEvent {
    const parsedEvent = JSON.parse(stringifiedEvent);
    return new AlertFeedEvent(parsedEvent.investingTicker, parsedEvent.feedInfo);
  }
}
