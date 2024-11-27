/**
 * Represents an alert
 */
export class Alert {
    Id: string;
    Price: number;
    PairId: string;

    constructor(id: string, pairId: string, price: number) {
        this.Id = id;
        this.PairId = pairId;
        this.Price = price;
    }
}

/**
 * Represents pair information for investing
 */
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

/**
 * Represents the result of an alert audit for a ticker
 */
export class AlertAudit {
    ticker: string;
    state: AlertState;

    constructor(ticker: string, state: AlertState) {
        this.ticker = ticker;
        this.state = state;
    }
}

/**
 * Enum for different alert states
 */
export enum AlertState {
    NO_ALERTS = 'NO_ALERTS',
    SINGLE_ALERT = 'SINGLE_ALERT',
    VALID = 'VALID'
}

// Static helper methods for AlertState
export const AlertStateUtils = {
    toString(state: AlertState): string {
        switch (state) {
            case AlertState.NO_ALERTS: return 'No Alerts Set';
            case AlertState.SINGLE_ALERT: return 'Only One Alert Set';
            case AlertState.VALID: return 'Valid';
            default: return 'Unknown State';
        }
    }
};