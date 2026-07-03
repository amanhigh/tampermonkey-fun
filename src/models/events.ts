/**
 * Abstract base class for all events
 * Enforces stringify method implementation for serialization
 */
export abstract class BaseEvent {
  /**
   * Serialize event to JSON string for storage
   * @returns JSON string representation of the event
   */
  public stringify(): string {
    return JSON.stringify(this);
  }
}

export enum AlertClickAction {
  OPEN = 'OPEN',
  MAP = 'MAP',
}

export class AlertClicked extends BaseEvent {
  constructor(
    readonly alertTicker: string,
    readonly action: AlertClickAction,
    readonly pairId?: string,
    readonly alertName?: string,
    readonly alertExchange?: string,
    readonly timestamp: number = Date.now()
  ) {
    super();
  }

  public static fromString(data: string): AlertClicked {
    const parsed = JSON.parse(data) as {
      alertTicker: string;
      action: string;
      pairId?: string;
      alertName?: string;
      alertExchange?: string;
    };
    return new AlertClicked(
      parsed.alertTicker,
      parsed.action as AlertClickAction,
      parsed.pairId,
      parsed.alertName,
      parsed.alertExchange
    );
  }
}

export class JournalOpenEvent extends BaseEvent {
  constructor(
    readonly journalId: string,
    readonly timestamp: number = Date.now()
  ) {
    super();
  }

  public static fromString(data: string): JournalOpenEvent {
    const parsed = JSON.parse(data) as { journalId: string };
    return new JournalOpenEvent(parsed.journalId);
  }
}

/**
 * Serializable event for cross-site ticker change synchronization.
 * Published via GM.setValue on TradingView, consumed on localhost dashboard.
 */
export class DashboardTickerChangedEvent extends BaseEvent {
  constructor(
    readonly ticker: string,
    readonly timestamp: number = Date.now()
  ) {
    super();
  }

  /**
   * Deserialize a DashboardTickerChangedEvent from a JSON string.
   * @param data - JSON string to parse
   * @returns Deserialized event
   */
  public static fromString(data: string): DashboardTickerChangedEvent {
    const parsed = JSON.parse(data) as { ticker: string; timestamp?: number };
    return new DashboardTickerChangedEvent(parsed.ticker, parsed.timestamp);
  }
}
