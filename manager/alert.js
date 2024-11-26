/**
 * Class representing the Alert Manager.
 */
class AlertManager {
    /**
     * Creates an instance of AlertManager.
     * @param {Object} alertStore - The store for managing alerts.
     * @param {AlertUIManager} uiManager - The UI manager instance.
     */
    constructor(alertStore, uiManager) {
        this.alertStore = alertStore;
        this.uiManager = uiManager;
        this.uiManager.registerDeleteAlertHandler(this._deleteAlert.bind(this));
    }

    /********** Public Methods **********/

    /**
     * Refreshes local alerts and updates UI.
     */
    refreshLocalAlerts() {
        waitOn('alert-refresh-local', 10, () => {
            const alerts = this._loadCachedAlerts();
            this.uiManager.displayAlerts(alerts);
            //TODO: Audit Current
        });
    }

    /**
     * Forces a refresh of all alerts from server.
     */
    forceRefreshAlerts() {
        getAllAlerts(this._onForceRefresh.bind(this));
    }

    /**
     * Initiates smart delete based on cursor price.
     */
    deleteAlertAtCursor() {
        getCursorPrice(price => {
            this.deleteAlertsByPrice(price);
        });
    }

    /********** Private Methods **********/
    /**
     * Handles force refresh response.
     * @param {Object} data - Alert data from server
     * @private
     */
    _onForceRefresh(data) {
        const count = this.alertStore.load(data);
        message(`Alerts Loaded: ${count}`);
        this.refreshLocalAlerts();
        // TODO: Audit All
    }

    /**
     * Handles alert creation for pair info.
     * @param {Object} pairInfo - Pair information
     * @param {number} price - Alert price
     * @private
     */
    _createAlertForPair(pairInfo, price) {
        createAlert(pairInfo.name, pairInfo.pairId, price, (alert) => {
            this.refreshLocalAlerts();
            message(`Alert created at ${price}`, 'green');
            // TODO Extract Hook
        });
    }

    /**
     * Handles missing pair info case.
     * @param {string} investingTicker - Ticker symbol
     * @param {number} price - Alert price
     * @private
     */
    async _handleMissingPairInfo(investingTicker, price) {
        message(`No pair info found for symbol: ${investingTicker}`, 'red');

        // TODO:  Inject Alert Mapper
        const mapper = new AlertMapper();
        const selectedPair = await mapper.mapTicker(investingTicker, getExchange());

        if (selectedPair) {
            this._createAlertForPair(selectedPair, price);
        } else {
            message("Mapping failed. Alert creation aborted.", 'red');
        }
    }

    /**
     * Creates alerts from textbox input values.
     * @param {string} inputId - ID of the input element
     */
    createAlertsFromTextBox(inputId) {
        // TODO: Inject InputId
        const price = $(`#${inputId}`).val();

        if (!price) {
            return;
        }

        const prices = price.trim().split(" ");
        const ticker = getMappedTicker();

        prices.forEach(p => {
            this.createTickerAlert(ticker, p);
        });

        setTimeout(() => {
            // TODO: Integrate clearFields Function
            $(`#${inputId}`).val('');
        }, 5000);
    }

    /**
     * Creates alert at cursor price position.
     */
    createAlertAtCursor() {
        getCursorPrice(price => {
            this.createTickerAlert(getMappedTicker(), price);
        });
    }

    /**
     * Creates alert 20% above current price.
     */
    createHighAlert() {
        const currentPrice = getLastTradedPrice();
        const targetPrice = (currentPrice * 1.2).toFixed(2);
        this.createTickerAlert(getMappedTicker(), targetPrice);
    }

    /**
     * Handles alert creation callback.
     * @param {string} name - Alert name
     * @param {string} pairId - Pair identifier
     * @param {number} price - Alert price
     * @private
     */
    _onAlertCreate(name, pairId, price) {
        const ltp = getLastTradedPrice();
        const color = ltp > price ? 'red' : 'green';

        message(`<span style="color: ${color};">Alert: ${name} = ${price}</span>`);

        this.alertStore.addAlert(pairId, new Alert(pairId, price));
        this.refreshLocalAlerts();
    }
}

/**
 * Class handling alert mapping functionality.
 */
class AlertMapper {
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

/**
 * Handles loading alerts from DOM elements
 */
class AlertLoader {
    /**
     * @private
     * @type {AlertRepo}
     */
    _alertRepo;

    /**
     * @param {AlertRepo} alertRepo Alert repository
     */
    constructor(alertRepo) {
        this._alertRepo = alertRepo;
    }

    /**
     * Load alerts from DOM elements
     * @param {Object} data jQuery DOM element containing alert items
     * @returns {number} Number of alerts loaded
     * @throws {Error} If loading fails
     */
    loadFromDOM(data) {
        try {
            this._alertRepo.clear();
            let count = 0;

            $(data).find('.js-alert-item[data-trigger=price]').each((i, alertElement) => {
                const $alt = $(alertElement);
                const alert = new Alert(
                    $alt.attr('data-pair-id'),
                    parseFloat($alt.attr('data-value'))
                );
                alert.Id = $alt.attr('data-alert-id');

                this._alertRepo.addAlert(alert.PairId, alert);
                count++;
            });

            return count;
        } catch (error) {
            throw new Error(`Failed to load alerts: ${error.message}`);
        }
    }
}