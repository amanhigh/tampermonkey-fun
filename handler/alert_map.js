/**
 * Class handling alert mapping functionality.
 */
class AlertMapHandler {
    /**
     * Creates an instance of AlertMapper.
     */
    constructor() {
    }

    /**
     * Maps a TradingView ticker to Investing.com pair data.
     * @param {string} investingTicker - The TradingView ticker symbol
     * @param {string} [exchange=""] - Optional exchange name
     * @returns {Promise<Object>} Mapped pair info
     */
    async mapTicker(investingTicker, exchange = "") {
        message(`Searching for ${investingTicker} on ${exchange}`, 'yellow');

        try {
            const pairs = await fetchSymbolData(investingTicker, exchange);
            const options = this._formatPairOptions(pairs);
            const selected = await SmartPrompt(options.slice(0, 10));

            if (!selected) {
                message("No selection made. Operation cancelled.", 'red');
                return null;
            }

            const selectedPair = this._findSelectedPair(pairs, selected);
            if (selectedPair) {
                message(`Selected: ${selectedPair.name} (ID: ${selectedPair.pairId})`, 'green');
                pinInvestingPair(investingTicker, selectedPair);
                return selectedPair;
            }

            message("Invalid selection.", 'red');
            return null;
        } catch (error) {
            message(`Error mapping alert: ${error.message}`, 'red');
            throw error;
        }
    }

    /**
     * Handles missing pair info case.
     * @param {string} investingTicker - Ticker symbol
     * @param {number} price - Alert price
     * @private
     */
    async _handleMissingPairInfo(investingTicker, price) {
        message(`No pair info found for symbol: ${investingTicker}`, 'red');

        const selectedPair = await this.mapTicker(investingTicker, getExchange());

        if (selectedPair) {
            this._createAlertForPair(selectedPair, price);
        } else {
            message("Mapping failed. Alert creation aborted.", 'red');
        }
    }

    /**
     * Formats pair data for display.
     * @param {Array} pairs - Array of pair objects
     * @returns {Array} Formatted strings
     * @private
     */
    _formatPairOptions(pairs) {
        return pairs.map(pair =>
            `${pair.name} (${pair.symbol}, ID: ${pair.pairId}, Exchange: ${pair.exchange})`
        );
    }

    /**
     * Finds selected pair from formatted string.
     * @param {Array} pairs - Array of pair objects
     * @param {string} selected - Selected formatted string
     * @returns {Object} Selected pair object
     * @private
     */
    _findSelectedPair(pairs, selected) {
        return pairs.find(pair =>
            `${pair.name} (${pair.symbol}, ID: ${pair.pairId}, Exchange: ${pair.exchange})` === selected
        );
    }
}