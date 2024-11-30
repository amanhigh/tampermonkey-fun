export class Alert {
  private _id: string;
  private _price: number;
  private _pairId: string;

  constructor(id: string, pairId: string, price: number) {
    this._id = id;
    this._pairId = pairId;
    this._price = price;
  }

  get id(): string {
    return this._id;
  }
  get price(): number {
    return this._price;
  }
  get pairId(): string {
    return this._pairId;
  }

  set id(value: string) {
    this._id = value;
  }
  set price(value: number) {
    this._price = value;
  }
  set pairId(value: string) {
    this._pairId = value;
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
  private _ticker: string;
  private _state: AlertState;

  constructor(ticker: string, state: AlertState) {
    this._ticker = ticker;
    this._state = state;
  }

  get ticker(): string {
    return this._ticker;
  }
  get state(): AlertState {
    return this._state;
  }

  set ticker(value: string) {
    this._ticker = value;
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
