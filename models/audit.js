/**
 * Represents the result of an alert audit for a ticker
 */
class AuditResult {
    ticker
    state

    constructor(ticker, state) {
        this.ticker = ticker;
        this.state = state;
    }
}
