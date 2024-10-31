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
    let $altz = $(`#${alertsId}`);
    $altz.empty();

    //Skip Composite Symbols
    if (!orderSet.contains(7, symb)) {
        //Map Symbol using mapInvestingPair
        let pairInfo = mapInvestingPair(symb);
        if (pairInfo) {
            alertSummary(alertStore.getSortedAlerts(pairInfo.pairId));
        } else {
            buildLabel("ALERT LOAD FAILED", 'orange').appendTo($altz);
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
        alertData.forEach((alt) => {
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
    let count = alertStore.load(data);

    //console.log(alertMap);
    message("Alerts Loaded: " + count)

    //Reload UI Alerts
    AlertRefreshLocal();

    // Perform Audit
    AuditAlerts();
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
    alertStore.removeAlert(pairId, alertId);

    AlertRefreshLocal();
}

