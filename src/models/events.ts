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
    readonly investingTicker: string,
    readonly action: AlertClickAction,
    readonly pairId?: string,
    readonly timestamp: number = Date.now()
  ) {
    super();
  }

  public static fromString(data: string): AlertClicked {
    const parsed = JSON.parse(data) as { investingTicker: string; action: string; pairId?: string };
    return new AlertClicked(parsed.investingTicker, parsed.action as AlertClickAction, parsed.pairId);
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
