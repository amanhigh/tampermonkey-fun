/**
 * Abstract base class for all events
 * Enforces stringify method implementation for serialization
 */
export abstract class BaseEvent {
  /**
   * Serialize event to JSON string for storage
   * @returns JSON string representation of the event
   */
  abstract stringify(): string;
}

export enum AlertClickAction {
  OPEN = 'OPEN',
  MAP = 'MAP',
}

export class AlertClicked extends BaseEvent {
  constructor(
    readonly ticker: string,
    readonly action: AlertClickAction
  ) {
    super();
  }

  /**
   * Serialize AlertClicked event to JSON string for storage
   * @returns JSON string representation of the event
   */
  public stringify(): string {
    return JSON.stringify({
      ticker: this.ticker,
      action: this.action,
    });
  }

  public static fromString(data: string): AlertClicked {
    const parsed = JSON.parse(data);
    return new AlertClicked(parsed.ticker, parsed.action);
  }
}
