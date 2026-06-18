import { BaseEvent } from './events';
import { DisplayInfo } from './display';

/**
 * Class representing an alert feed event
 */
export class AlertFeedEvent extends BaseEvent {
  investingTicker: string;
  feedInfo: DisplayInfo;

  constructor(investingTicker: string, feedInfo: DisplayInfo) {
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
    const parsedEvent = JSON.parse(stringifiedEvent) as { investingTicker: string; feedInfo: DisplayInfo };
    return new AlertFeedEvent(parsedEvent.investingTicker, parsedEvent.feedInfo);
  }
}
