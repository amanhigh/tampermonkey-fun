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
        //Search Symbol from Cache
        searchSymbol(symb, function (top) {
            alertSummary(alertMap.get(top.pairId))
        });
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
            //Alert Below Price -> Green, Above -> Red, Unverified -> Orange
            let coloredPrice = alt.Id === undefined ? priceString.fontcolor('orange') : alt.Price < ltp ? priceString.fontcolor('seagreen') : priceString.fontcolor('orangered');

            //Add Deletion Button
            buildButton("", coloredPrice, HandleAlertDelete).data('alt', alt).appendTo($altz);
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
    let symb = getMappedTicker();
    // Read Alert Price from Text Box
    let price = $(`#${priceId}`).val();

    // If Price is not empty
    if (price) {
        //Split Alert Prices 
        let split = price.trim().split(" ");

        //Search Symbol
        searchSymbol(symb, function (top) {
            message(top.name + ': ');

            //Set Alerts
            for (let p of split) {
                createAlert(top.pairId, p, onAlertCreate);
            }

            //Clear Values
            setTimeout(clearFields, 5000);
        });
    }
}

/**
 * Trigger AutoAlert Create by reading Price and creating alert.
 */
function AlertCreateSmart() {
    getCursorPrice((altPrice) => {
        searchSymbol(getMappedTicker(), function (top) {
            createAlert(top.pairId, altPrice, onAlertCreate);
        });
    })
}

/**
 * Function to handle the creation of an alert.
 *
 * @param {string} pairId - The ID of the currency pair for the alert
 * @param {number} price - The price at which the alert is set
 * @return {void} 
 */
function onAlertCreate(pairId, price) {
    addAlertToStore(pairId, price);

    AlertRefreshLocal();
}

function addAlertToStore(pairId, price) {
    let alerts = alertMap.get(pairId) || [];
    alerts.push(new Alert(pairId, price));
    alertMap.set(pairId, alerts);
}
