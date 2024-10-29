/* global waitOn, AuditCurrentTicker, getAllAlerts, getMappedTicker, orderSet, 
   mapInvestingPair, alertStore, buildLabel, getLastTradedPrice, buildButton, 
   HandleAlertDelete, deleteAlert, getCursorPrice, createAlert, AuditAlerts, clearFields, mapAlert, 
   getExchange, SmartPrompt, pinInvestingPair, getTicker, pinInvestingTicker, 
   OpenTicker, fetchSymbolData, Alert, message, alertsId, inputId */

// Export functions that are used in other files
window.AlertRefreshLocal = AlertRefreshLocal;
window.ForceRefreshAlerts = ForceRefreshAlerts;
window.ResetAlerts = ResetAlerts;
window.AlertDeleteSmart = AlertDeleteSmart;
window.HandleTextBoxCreateAlert = HandleTextBoxCreateAlert;
window.AlertCreateSmart = AlertCreateSmart;
window.createHighAlert = createHighAlert;
window.HandleAlertClick = HandleAlertClick;

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

        // Call mapAlert to allow user to map the ticker
        mapAlert(investingTicker, getExchange()).then(selectedPair => {
            if (selectedPair) {
                createAlert(selectedPair.name, selectedPair.pairId, price, onAlertCreate);
            } else {
                message("Mapping was not successful. Alert creation aborted.", 'red');
            }
        });
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

    alertStore.addAlert(pairId, new Alert(pairId, price));

    AlertRefreshLocal();
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
 * @return {Promise<Object>} - Promise resolving to the mapped pair info
 */
function mapAlert(investingTicker, exchange = "") {
    const symbolToSearch = investingTicker;
    message(`Searching for ${symbolToSearch} on ${exchange}`, 'yellow');

    return fetchSymbolData(symbolToSearch, exchange)
        .then(pairs => {
            // Create an array of strings combining pair details
            const options = pairs.map(pair =>
                `${pair.name} (${pair.symbol}, ID: ${pair.pairId}, Exchange: ${pair.exchange})`
            );

            // Limit options to the top 10 results
            const limitedOptions = options.slice(0, 10);

            // Use smartPrompt to let user select a pair
            return SmartPrompt(limitedOptions).then(selected => {
                if (selected === '') { // Handle empty string for cancel
                    message("No selection made. Operation cancelled.", 'red');
                    return null; // User canceled the prompt
                }

                // Find the selected pair based on user choice
                const selectedPair = pairs.find(pair =>
                    `${pair.name} (${pair.symbol}, ID: ${pair.pairId}, Exchange: ${pair.exchange})` === selected
                );

                if (selectedPair) {
                    message(`You selected: ${selectedPair.name} (ID: ${selectedPair.pairId})`, 'green');

                    // Pin the selected investing pair
                    pinInvestingPair(investingTicker, selectedPair);

                    return selectedPair; // Return the selected pair for further processing
                } else {
                    message("Invalid selection.", 'red');
                    return null; // Handle invalid selection case
                }
            });
        })
        .catch(error => {
            message(`Error mapping alert: ${error.message}`, 'red');
            throw error;
        });
}
