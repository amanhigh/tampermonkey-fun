export class Alert {
  id: string;
  price: number;
  pairId: string;
  name: string;

  constructor(id: string, pairId: string, price: number, name = '') {
    this.id = id;
    this.pairId = pairId;
    this.price = price;
    this.name = name;
  }
}

export class PairInfo {
  name: string;
  pairId: string;
  exchange: string;
  symbol: string;

  constructor(name: string, pairId: string, exchange: string, symbol: string) {
    const type = typeof pairId;
    if (type !== 'string') {
      throw new Error(`Expected ${name}, pairID - ${pairId} to be a string, got ${type}`);
    }
    this.name = name;
    this.pairId = pairId;
    this.exchange = exchange;
    this.symbol = symbol;
  }
}

/**
 * Enum for alert coverage audit states.
 */
export enum AlertState {
  NO_ALERTS = 'NO_ALERTS',
  SINGLE_ALERT = 'SINGLE_ALERT',
  VALID = 'VALID',
}
