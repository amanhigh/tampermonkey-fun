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

