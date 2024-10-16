// Alert -- Refresh

function AlertRefreshLocal() {
    waitOn('alert-refresh-local', 10, () => {
        //Locally Refresh Alerts
        loadCachedAlert();
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
    $(`#${altzId}`).empty();

    //Skip Composite Symbols
    if (!orderSet.get(7).has(symb)) {
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
    let $altz = $(`#${altzId}`);

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
    $('#aman-altz > button').each((i, e) => {
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
