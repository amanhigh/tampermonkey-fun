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

export class AlertClicked extends BaseEvent {
  tvTicker: string | null;
  investingTicker: string | null;

  constructor(tvTicker: string | null, invTicker: string | null) {
    super();
    this.tvTicker = tvTicker;
    this.investingTicker = invTicker;
  }

  /**
   * Serialize AlertClicked event to JSON string for storage
   * @returns JSON string representation of the event
   */
  public stringify(): string {
    return JSON.stringify({
      tvTicker: this.tvTicker,
      investingTicker: this.investingTicker,
    });
  }
}
