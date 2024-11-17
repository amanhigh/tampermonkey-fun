/**
 * Represents an alert
 * @typedef {Object} Alert
 * @property {string} Id
 * @property {number} Price
 * @property {string} PairId
 */
class Alert {
    Id
    Price
    PairId

    constructor(pairId, price) {
        this.PairId = pairId;
        this.Price = price;
    }
}

/**
 * Represents pair information for investing
 */
class PairInfo {
    constructor(name, pairId, exchange) {
        this.name = name;
        this.pairId = pairId;
        this.exchange = exchange;
    }
}

/**
 * Represents the result of an alert audit for a ticker
 */
class AlertAudit {
    ticker
    state

    constructor(ticker, state) {
        this.ticker = ticker;
        this.state = state;
    }
}


/**
 * Enum for different alert states
 */
const AlertState = {
    NO_ALERTS: 'NO_ALERTS',
    SINGLE_ALERT: 'SINGLE_ALERT',
    VALID: 'VALID',
    toString: function (state) {
        switch (state) {
            case this.NO_ALERTS: return 'No Alerts Set';
            case this.SINGLE_ALERT: return 'Only One Alert Set';
            case this.VALID: return 'Valid';
            default: return 'Unknown State';
        }
    }
};

