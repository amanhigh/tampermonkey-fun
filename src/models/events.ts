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
  private _tvTicker: string;
  private _investingTicker: string;

  constructor(tvTicker: string, invTicker: string) {
    super();
    this._tvTicker = tvTicker;
    this._investingTicker = invTicker;
  }

  get tvTicker(): string {
    return this._tvTicker;
  }
  get investingTicker(): string {
    return this._investingTicker;
  }

  set tvTicker(value: string) {
    this._tvTicker = value;
  }
  set investingTicker(value: string) {
    this._investingTicker = value;
  }

  /**
   * Serialize AlertClicked event to JSON string for storage
   * @returns JSON string representation of the event
   */
  public stringify(): string {
    return JSON.stringify({
      tvTicker: this._tvTicker,
      investingTicker: this._investingTicker,
    });
  }
}
