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