export class Alert {
  id: string;
  price: number;
  pairId: string;

  constructor(id: string, pairId: string, price: number) {
    this.id = id;
    this.pairId = pairId;
    this.price = price;
  }
}

export class PairInfo {
  name: string;
  pairId: string;
  exchange: string;

  constructor(name: string, pairId: string, exchange: string) {
    const type = typeof(pairId);
    if (type !== 'string') {
      throw new Error(`Expected ${name}, pairID - ${pairId} to be a string, got ${type}`);
    }
    this.name = name;
    this.pairId = pairId;
    this.exchange = exchange;
  }
}

export class AlertAudit {
  investingTicker: string;
  state: AlertState;

  constructor(investingTicker: string, state: AlertState) {
    this.investingTicker = investingTicker;
    this.state = state;
  }
}

export class AuditStateCounts {
  private readonly counts: Map<AlertState, number>;

  constructor() {
    this.counts = new Map();
    Object.values(AlertState).forEach((state) => this.counts.set(state, 0));
  }

  increment(state: AlertState): void {
    const current = this.counts.get(state) || 0;
    this.counts.set(state, current + 1);
  }

  getCount(state: AlertState): number {
    return this.counts.get(state) || 0;
  }

  getFormattedSummary(): string {
    const summaries = Object.values(AlertState).map((state) => `${state}: ${this.getCount(state)}`);
    return summaries.join(', ');
  }
}

/**
 * Enum for different alert states
 */
export enum AlertState {
  NO_ALERTS = 'NO_ALERTS',
  SINGLE_ALERT = 'SINGLE_ALERT',
  VALID = 'VALID',
  NO_PAIR = 'NO_PAIR',
}
