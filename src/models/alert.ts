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

/**
 * Enum for different alert states
 */
export enum AlertState {
  NO_ALERTS = 'NO_ALERTS',
  SINGLE_ALERT = 'SINGLE_ALERT',
  VALID = 'VALID',
}
