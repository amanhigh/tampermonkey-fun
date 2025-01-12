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
  private _name: string;
  private _pairId: string;
  private _exchange: string;

  constructor(name: string, pairId: string, exchange: string) {
    this._name = name;
    this._pairId = pairId;
    this._exchange = exchange;
  }

  get name(): string {
    return this._name;
  }
  get pairId(): string {
    return this._pairId;
  }
  get exchange(): string {
    return this._exchange;
  }

  set name(value: string) {
    this._name = value;
  }
  set pairId(value: string) {
    this._pairId = value;
  }
  set exchange(value: string) {
    this._exchange = value;
  }
}

export class AlertAudit {
  private _investingTicker: string;
  private _state: AlertState;

  constructor(investingTicker: string, state: AlertState) {
    this._investingTicker = investingTicker;
    this._state = state;
  }

  get investingTicker(): string {
    return this._investingTicker;
  }
  get state(): AlertState {
    return this._state;
  }

  set investingTicker(value: string) {
    this._investingTicker = value;
  }
  set state(value: AlertState) {
    this._state = value;
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
