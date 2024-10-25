// Alert -- Refresh

function AlertRefreshLocal() {
    waitOn('alert-refresh-local', 10, () => {
        //Locally Refresh Alerts
        loadCachedAlert();

        // Update Audit
        AuditCurrentTicker();
    });
}

function ForceRefreshAlerts() {
    getAllAlerts(onAlertForceRefresh);
}

/**
 * Get Alerts for Ticker from Cache
 * And Trigger Alert Summary
 *
 * @return {void} 
 */
function loadCachedAlert() {
    //Search Symbol
    let symb = getMappedTicker();

    //Explicitly Clear alerts to avoid stale alerts.
    $(`#${alertsId}`).empty();

    //Skip Composite Symbols
    if (!orderSet.contains(7, symb)) {
        //Map Symbol using mapInvestingPair
        let pairInfo = mapInvestingPair(symb);
        if (pairInfo) {
            alertSummary(alertMap.get(pairInfo.pairId));
        } else {
            message(`Can't load alerts. No pair info found for symbol: ${symb}`, 'red');
        }
    }
}

/**
 * Function to display alert summary based on the provided alert data.
 *
 * @param {object} alertData - the alert data to be displayed
 * @return {void} 
 */
function alertSummary(alertData) {
    let ltp = getLastTradedPrice();
    let $altz = $(`#${alertsId}`);

    // Add Alert Buttons
    if (alertData) {
        alertData.sort(((a, b) => {
            return a.Price - b.Price;
        })).forEach((alt) => {
            let priceString = alt.Price.toString();
            let percentage = ((alt.Price - ltp) / ltp * 100).toFixed(2); // Calculate percentage difference
            let percentageString = percentage >= 0 ? `(+${percentage})` : `(${percentage})`;

            //Alert Below Price -> Green, Above -> Red, Unverified -> Orange
            let coloredPrice = alt.Id === undefined ? priceString.fontcolor('orange') : alt.Price < ltp ? priceString.fontcolor('seagreen') : priceString.fontcolor('orangered');

            // Add price and percentage to the button
            let displayString = `${coloredPrice} ${percentageString}`;
            //Add Deletion Button
            buildButton("", displayString, HandleAlertDelete).data('alt', alt).appendTo($altz);
        });
    } else {
        buildLabel("No AlertZ", 'red').appendTo($altz);
    }
}

/**
 * Alert Map is Save and UI Refresh is Triggerd.
 * @param data
 */
function onAlertForceRefresh(data) {
    let count = saveAlerts(data);

    //console.log(alertMap);
    message("Alerts Loaded: " + count)

    //Reload UI Alerts
    AlertRefreshLocal();

    // Perform Audit
    auditAlerts((auditResults) => {
        auditMap = auditResults; // Update global auditMap
        DoAlertAudit();
    });

}

/**
 * Parses Alert Data and saves it in Alert Map.
 *
 * @param {Object} data - the data containing price alerts
 * @return {number} the count of alerts saved
 */
function saveAlerts(data) {
    alertMap = new Map();
    let count = 0;

    //Parse Html Data and extract price alerts
    $('<div/>').html(data).find('.js-alert-item[data-trigger=price]').each((i, alertText) => {
        const $alt = $(alertText);

        //Construct Alert
        let alert = new Alert();
        alert.Id = $alt.attr('data-alert-id');
        alert.Price = parseFloat($alt.attr('data-value'));
        alert.PairId = parseFloat($alt.attr('data-pair-id'));

        //Get Alerts for this Alert Name
        let alerts = alertMap.get(alert.PairId) || [];
        //Add Alert
        count++;
        alerts.push(alert);
        //Update Map
        alertMap.set(alert.PairId, alerts);
    });
    return count;
}

// Alert - Delete

/**
 * Handle the deletion of an alert.
 *
 * @param {event} evt - the event triggering the alert deletion
 * @return {undefined} 
 */
function HandleAlertDelete(evt) {
    let $target = $(evt.currentTarget);
    let alt = $target.data('alt');
    deleteAlert(alt, onAlertDelete);
}

/**
 * Deletes all alerts by clicking on each alert button.
 *
 */
function ResetAlerts() {
    //Go over Alert Buttons
    $(`#${alertsId} > button`).each((i, e) => {
        $(e).click();
    });
}

/**
 * Deletes alert buttons within a certain price
 * tolerance of the current price.
 */
function AlertDeleteSmart() {
    getCursorPrice((altPrice) => {
        //Tolerance for price search (3%)
        let tolerance = altPrice * 0.03;

        //Go over Alert Buttons
        $('#aman-altz > button').each((i, e) => {
            let $e = $(e);
            let buttonPrice = parseFloat($e.text());
            //Delete Alert if its near alert Price
            if ((altPrice - tolerance) < buttonPrice && buttonPrice < (altPrice + tolerance)) {
                $e.click();
            }
        });
    })
}

/**
 * Store remove alert and UI Refresh
 * @param pairId
 * @param alertId
 */
function onAlertDelete(pairId, alertId) {
    removeAlertStore(pairId, alertId);

    AuditCurrentTicker();
    AlertRefreshLocal();
}

/**
 * Removes the specified alert from the alert store for the given pair ID.
 *
 * @param {type} pairId - The ID of the pair for which the alert is to be removed
 * @param {type} alertId - The ID of the alert to be removed
 * @return {type} void
 */
function removeAlertStore(pairId, alertId) {
    let alerts = alertMap.get(pairId) || [];
    alerts = alerts.filter(item => item.Id != alertId);
    alertMap.set(pairId, alerts);
}

// Alert - Create

/**
 * Handle the creation of an alert based on the text box input
 * for a specific ticker symbol.
 *
 * @param {} 
 * @return {}
 */
function HandleTextBoxCreateAlert() {
    // Read Alert Price from Text Box
    let price = $(`#${inputId}`).val();

    // If Price is not empty
    if (price) {
        //Split Alert Prices 
        let split = price.trim().split(" ");

        //Set Alerts
        for (let p of split) {
            CreateTickerAlert(getMappedTicker(), p);
        }

        //Clear Values
        setTimeout(clearFields, 5000);
    }
}

/**
 * Trigger AutoAlert Create by reading Price and creating alert.
 */
function AlertCreateSmart() {
    getCursorPrice((altPrice) => {
        CreateTickerAlert(getMappedTicker(), altPrice);
    })
}

/**
 * Create a ticker alert for the given ticker and price.
 *
 * @param {string} investingTicker - the ticker symbol
 * @param {number} price - the price for the alert
 * @return {void} 
 */
function CreateTickerAlert(investingTicker, price) {
    let pairInfo = mapInvestingPair(investingTicker);
    if (pairInfo) {
        createAlert(pairInfo.name, pairInfo.pairId, price, onAlertCreate);
    } else {
        message(`Can't create alert. No pair info found for symbol: ${investingTicker}`, 'red');
    }
}

/**
 * Handle the alert button click event by
 * computing the price x% above the current price
 * and creating an alert.
 *
 * @return {void}
 */
function createHighAlert() {
    let price = getLastTradedPrice();

    // Compute Price 20% above current price
    let priceAbove = (price * 1.2).toFixed(2);
    CreateTickerAlert(getMappedTicker(), priceAbove);
}

/**
 * Function to handle the creation of an alert.
 *
 * @param {string} pairId - The ID of the currency pair for the alert
 * @param {number} price - The price at which the alert is set
 * @return {void} 
 */
function onAlertCreate(name, pairId, price) {
    //Display Alert Set
    let ltp = getLastTradedPrice();
    let color = ltp > price ? 'red' : 'green';
    message(`<span style=\"color: ${color};\">Alert: ${name} = ${price}</span>`);

    addAlertToStore(pairId, price);

    AuditCurrentTicker();
    AlertRefreshLocal();
}

function addAlertToStore(pairId, price) {
    let alerts = alertMap.get(pairId) || [];
    alerts.push(new Alert(pairId, price));
    alertMap.set(pairId, alerts);
}

// Alert - Clicked

/**
 * Handle the click event on an alert.
 *
 * @param {AlertClicked} evt - The event object containing information about the click event
 * @return {void} 
 */
function HandleAlertClick(evt) {
    if (evt.InvestingTicker) {
        // Pin Alert To Current Ticker
        pinInvestingTicker(getTicker(), evt.InvestingTicker);
    } else {
        // Open Ticker
        OpenTicker(evt.TvTicker);
    }
}

/**
 * Maps a TradingView ticker to Investing.com pair data and saves it.
 *
 * @param {string} investingTicker - The TradingView ticker symbol
 * @param {string} [exchange=""] - Optional exchange name for filtering results
 * @param {string} [searchTerm=""] - Optional search term for fetchSymbolData
 * @return {Promise<Object>} - Promise resolving to the mapped pair info
 */
function mapAlert(investingTicker, exchange = "", searchTerm = "") {
    const symbolToSearch = searchTerm || investingTicker;
    message(`Searching for ${symbolToSearch} on ${exchange}`, 'yellow');
    return fetchSymbolData(symbolToSearch, exchange)
        .then(pairInfo => {
            pinInvestingPair(investingTicker, pairInfo);
            return pairInfo;
        })
        .catch(error => {
            message(`Error mapping alert: ${error.message}`, 'red');
            throw error;
        });
}

// Audit - Alerts

function auditAlerts(callback) {
    auditMap = new AuditMap();
    const tickers = getAllAlertTickers();
    const batchSize = 50;
    let currentIndex = 0;

    function processBatch() {
        const endIndex = Math.min(currentIndex + batchSize, tickers.length);

        for (let i = currentIndex; i < endIndex; i++) {
            const ticker = tickers[i];
            const state = auditTickerAlerts(ticker);
            auditMap.addResult(ticker, state);
        }

        currentIndex = endIndex;
        if (currentIndex < tickers.length) {
            requestAnimationFrame(processBatch);
        } else {
            message(`Audited ${auditMap.results.size} tickers`, 'green');
            if (callback) {
                callback(auditMap);
            }
        }
    }

    requestAnimationFrame(processBatch);
    return auditMap;
}

/**
 * Audits alerts for a single ticker
 * @param {string} ticker - The ticker to audit
 * @returns {AlertState} The audit state for the ticker
 */
function auditTickerAlerts(ticker) {
    const pairInfo = mapInvestingPair(ticker);
    if (!pairInfo) {
        return AlertState.NO_ALERTS;
    }

    const alerts = alertMap.get(pairInfo.pairId) || [];
    return alerts.length === 0 ? AlertState.NO_ALERTS :
        alerts.length === 1 ? AlertState.SINGLE_ALERT :
            AlertState.VALID;
}

/**
 * Audits the current ticker
 */
function AuditCurrentTicker() {
    const ticker = getMappedTicker();
    const state = auditTickerAlerts(ticker);
    auditMap.addResult(ticker, state);
    refreshAuditButton();
}


/**
 * Shows audit results in the audit area using buttons
 * @param {number} [batchSize=10] Number of alerts to show at once
 */
function DoAlertAudit(batchSize = 10) {
    // Filter out tickers that are in orderSet
    const filterResults = (results) => {
        return results.filter(result => !orderSet.containsAny(result.ticker));
    };

    const singleAlerts = filterResults(auditMap.getFilteredResults(AlertState.SINGLE_ALERT));
    const noAlerts = filterResults(auditMap.getFilteredResults(AlertState.NO_ALERTS));

    if (singleAlerts.length === 0 && noAlerts.length === 0) {
        message("No alerts to audit", "yellow");
        return;
    }

    // Clear existing audit area
    $(`#${auditId}`).empty();

    // Add single alert buttons
    singleAlerts.slice(0, batchSize).forEach(result => {
        createAuditButton(result.ticker, true).appendTo(`#${auditId}`);
    });

    // Add no-alert buttons
    noAlerts.slice(0, batchSize).forEach(result => {
        createAuditButton(result.ticker, false).appendTo(`#${auditId}`);
    });

    message(`Audit Refreshed: ${singleAlerts.length} Single Alerts, ${noAlerts.length} No Alerts`, 'green');
}

/**
 * Refreshes or creates audit button for current ticker based on latest audit state
 */
function refreshAuditButton() {
    const ticker = getMappedTicker();
    const result = auditMap.getResult(ticker);

    if (!result) return;

    // Find existing button for this ticker
    const buttonId = $(`#${getAuditButtonId(ticker)}`);

    // If ticker has valid alerts, remove the button if it exists
    if (result.state === AlertState.VALID) {
        buttonId.remove();
        return;
    }

    // Create new button with updated state
    const newButton = createAuditButton(
        ticker,
        result.state === AlertState.SINGLE_ALERT
    );

    // Replace existing button or append new one
    if (buttonId.length) {
        buttonId.replaceWith(newButton);
    } else {
        newButton.appendTo(`#${auditId}`);
    }

    message(`Audit Refreshed: ${ticker} ${result.state}`, 'green');
}

/**
 * Creates a button for an audited ticker
 * @param {string} ticker The ticker symbol
 * @param {boolean} hasSingleAlert Whether the ticker has a single alert
 * @returns {jQuery} The created button element
 */
function createAuditButton(ticker, hasSingleAlert) {
    const buttonId = getAuditButtonId(ticker);
    const button = buildButton(
        buttonId,
        ticker,
        (e) => {
            if (e.ctrlKey) {
                let investingTicker = mapTicker(ticker);
                if (investingTicker) {
                    pinInvestingTicker(ticker, investingTicker);
                } else {
                    message(`Can't map alert: ${ticker}`, 'red');
                }
            } else {
                OpenTicker(ticker);
            }
        }
    ).css({
        'background-color': hasSingleAlert ? 'darkred' : 'darkgray',
        'margin': '2px'
    });

    button.on('contextmenu', (e) => {
        e.preventDefault();
        deletePairInfo(ticker);
        button.remove();
        message(`Removed mapping for ${ticker}`, 'yellow');
    });

    return button;
}

function getAuditButtonId(ticker) {
    return `audit-${ticker}`.replace('/', '-');
}