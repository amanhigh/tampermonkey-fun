// -- Ticker Mappers

/**
 * Resolve Current Ticker to mapping if Available.
 *
 * @return {type} Mapped Ticker
 */
function getMappedTicker() {
    return mapTicker(getTicker());
}

/**
 * Resolve ticker to use Investing Ticker if available
 * and return the resolved ticker.
 *
 * @param {string} tvTicker - The ticker to be resolved
 * @return {string} The resolved ticker
 */
function mapTicker(tvTicker) {
    // Use Investing Ticker if available
    let investingTicker = dataSilo.tickerMap[tvTicker];
    if (investingTicker) {
        tvTicker = investingTicker;
    }

    //console.log(tvTicker,investingTicker);
    return tvTicker;
}

/**
 * A function that maps current ticker to a sequence from the dataSilo, 
 * returning the sequence if found, otherwise returning the DEFAULT_SEQUENCE.
 *
 * @return {type} the mapped sequence or DEFAULT_SEQUENCE if not found
 */
function getSequence() {
    let sequence = dataSilo.sequenceMap[getTicker()];
    if (!sequence) {
        // Default Sequence Based on Exchange
        sequence = getExchange() === NSE_EXCHANGE ? DEFAULT_SEQUENCE : HIGH_SEQUENCE;
    }
    return sequence;
}

/**
 * Maps the given TV ticker to its exchange counterpart.
 *
 * @param {string} tvTicker - The TV ticker to be mapped to its exchange.
 * @return {string} Ticker with Exchange
 */
function mapExchangeTicker(tvTicker) {
    let exchange = dataSilo.tvPinMap[tvTicker];
    return exchange ? exchange : tvTicker;
}


// -- Ticker Pinners

/**
 * Pin TV Ticker to Exchange
 * 
 * @param {string} tvTicker - The TV ticker to pin
 * @param {string} exchange - The exchange to pin the TV ticker to
 * @return {void} 
 */
function pinExchangeTicker(tvTicker, exchange) {
    // TODO: Merge Pin Exchange with Pin Investing
    dataSilo.tvPinMap[tvTicker] = `${exchange}:${tvTicker}`;
    message(`Pinned Exchange: ${tvTicker} to ${exchange}`.fontcolor('yellow'));
}

/**
 * Pin the alert name to given TV ticker.
 *
 * @param {string} tvTicker - The TV ticker to map to the alert name
 * @param {string} alertName - The name of the alert to map
 * @return {void} 
 */
function pinAlertName(tvTicker, alertName) {
    dataSilo.alertNameMap[alertName] = tvTicker;
    message(`Pinned Alert: ${alertName} to ${tvTicker}`.fontcolor('yellow'));
}

/**
 * Pins a sequence to a TV ticker in the dataSilo object and displays a message.
 *
 * @param {string} tvTicker - The TV ticker to pin the sequence to.
 * @return {void} This function does not return anything.
 */
function toggleSequence(tvTicker) {
    // Flip Currently Set Sequence
    let sequence = getSequence() === HIGH_SEQUENCE ? DEFAULT_SEQUENCE : HIGH_SEQUENCE;
    //Remove Mapping If Exists.
    if (dataSilo.sequenceMap[tvTicker]) {
        dataSilo.sequenceMap[tvTicker] = null;
    } else {
        dataSilo.sequenceMap[tvTicker] = sequence;
    }
    message(`Pinned Sequence: ${tvTicker} to ${sequence}`.fontcolor('yellow'));
}

/**
 * Maps the TV ticker to the investing ticker if they are not already the same.
 *
 * @param {string} tvTicker - The TV ticker to be mapped.
 * @param {string} investingTicker - The investing ticker to map to.
 * @return {void} 
 */
function pinInvestingTicker(tvTicker, investingTicker) {
    if (tvTicker !== investingTicker) {
        dataSilo.tickerMap[tvTicker] = investingTicker;
        message(`Mapped Ticker: ${tvTicker} to ${investingTicker}`.fontcolor('yellow'));
    }
}

/**
 * Process Action with Value.
 * 
 */
function processTextAction() {
    //HACK: Refactor Code Below
    //Get TradingView Ticker
    let tvTicker = getTicker();
    let help = `
    InvestingTicker: T=DHLF<br/>
    PinExchange: E=NSE<br/>
    TickerWithExchange: P=NSE:DHFL
    `

    //Get Input Text
    let input = $(`#${inputId}`).val();
    if (input) {
        let actionSplit = input.split("=");
        if (actionSplit.length === 2) {
            //Extract Action and Value
            let action = actionSplit[0];
            let value = actionSplit[1];

            //Switch on Action
            switch (action) {
                case "T":
                    //Map Symbol to Current TV Ticker
                    pinInvestingTicker(tvTicker, value);
                    break;
                case "P":
                    //FIXME: Stand on Correct Ticker and Exchange and Trigger Map
                    //Extract Exchange and Symbol
                    let exchangeSplit = value.split(":");
                    let exchange = exchangeSplit[0];
                    let symbol = exchangeSplit[1];

                    //Map Symbol to Current TV Ticker
                    pinInvestingTicker(tvTicker, symbol);
                    //Set Proper Pair Id based on Exchange
                    searchSymbol(symbol, () => {
                    }, exchange)
                    break;
                case "E":
                    //Map Exchange to Current TV Ticker
                    pinExchangeTicker(tvTicker, value);
            }
        } else {
            message(`Invalid Map Format. ${help}`.fontcolor("red"))
        }

        //Clear Inputs
        clearFields();
    }
}

// -- Support Functions

function displaySequence() {
    $(`#${inputId}`).val(getTicker() + ':' + getSequence());
}

/**
 * Clears the input fields.
 *
 * @return {void} 
 */
function clearFields() {
    $(`#${inputId}`).val("");
    $(`#${priceId}`).val("");
}

/**
 * Trims the input string by removing specific substrings,
 * trimming whitespace, and joining the first two words with a plus sign.
 * 
 * Eg. Pair Map Name is 'Reliance Industries Ltd' but Alert Feed Name is 'Reliance Industries'.
 *
 * @param {string} name - The input string to be trimmed and processed
 * @return {string} The processed string
 */
function generateAlertFeedName(name) {
    return name.replace(' Ltd.', '').replace(' Ltd', '').trim().split(' ').slice(0, 2).join('+');
}

// -- Data Loaders/Storeres

function loadTradingViewVars() {
    orderSet = new OrderSet();
    flagSet = new FlagSet();
    loadDataSilo();
}

function loadDataSilo() {
    dataSilo = GM_getValue(dataSiloStore, {});
    recentTickers = new Set(dataSilo.recentTickers);
    //Enable/Disable Recent based on weather previous state had recent Tickers
    $(`#${recentId}`).prop('checked', recentTickers.size > 0)
}

function saveDataSilo() {
    dataSilo.recentTickers = [...recentTickers];
    GM_setValue(dataSiloStore, dataSilo);
}

// -- TradingView Readers

/**
 * Retrieves the name from the DOM using the provided nameSelector.
 *
 * @return {string} the name retrieved from the DOM
 */
function getName() {
    return $(nameSelector)[0].innerHTML;

}

/*
* Retrieves the ticker from the DOM.
*
* @return {string} Current Ticker.
*/
function getTicker() {
    return $(tickerSelector).html();
}

/**
 * Retrieves the selected tickers from the watch list and screener.
 *
 * @return {Array} An array of selected tickers
 */
function getTickersSelected() {
    //Get Selected Items
    let selected = getTickersWatchListSelected().concat(getTickersScreenerSelected());

    //Use Active Ticker if Non Multiple Selection
    if (selected.length < 2) {
        selected = [getTicker()];
    }
    return selected;
}

/**
 * Retrieves the tickers from the watch list with the option to specify visibility.
 *
 * @param {boolean} visible - indicates whether the tickers should be visible
 * @return {type} the tickers from the watch list
 */
function getTickersWatchList(visible = false) {
    return tickerListHelper(watchListSymbolSelector, visible);
}

/**
 * Retrieves tickers from the screener.
 *
 * @param {boolean} visible - indicates if the tickers are visible
 * @return {type} list of screener tickers
 */
function getTickersScreener(visible = false) {
    return tickerListHelper(screenerSymbolSelector, visible);
}

/**
 * Retrieves the selected watch list symbols from the DOM.
 *
 * @return {Array} An array of selected watch list symbols
 */
function getTickersWatchListSelected() {
    return $(`${watchListSelectedSelector} ${watchListSymbolSelector}:visible`).toArray().map(s => s.innerHTML);
}

/**
 * Retrieves the tickers of the selected items in the screener.
 *
 * @return {Array} An array of ticker symbols
 */
function getTickersScreenerSelected() {
    return $(`${screenerSelectedSelector} ${screenerSymbolSelector}:visible`).toArray().map(s => s.innerHTML);
}

/**
 * Retrieves the list of tickers based on the provided selector and visibility flag.
 *
 * @param {string} selector - The CSS selector for identifying the elements
 * @param {boolean} [visible=false] - Flag indicating whether to consider only visible elements
 * @return {Array<string>} An array of ticker strings
 */
function tickerListHelper(selector, visible = false) {
    return $(visible ? selector + ":visible" : selector).toArray().map(s => s.innerHTML);
}

/**
 * Retrieves the currently selected exchange.
 *
 * @return {string} Currently Selected Exchange
 */
function getExchange() {
    return $(exchangeSelector).text();
}

/**
 * Wait for Add Alert Context Menu Option to Capture Price.
 *
 * @param {function} callback - Function to be called with the alert price
 * @return {void}
 */
function getCursorPrice(callback) {
    //Wait for Add Alert Context Menu Option
    waitJEE(autoAlertSelector, function (el) {
        let regExp = /[+-]?\d+(\.\d+)?/g;
        let match = regExp.exec(el.text());
        let altPrice = parseFloat(match[0])

        //Call Function with Char Alert Price
        // console.log("Text", el.text(),"Match", match, "Alert", altPrice);
        callback(altPrice);
    });
}

/**
 * Reads the last traded price.
 * @return {number} The last traded price as a floating point number.
 */
function getLastTradedPrice() {
    return parseFloat($(ltpSelector).text());
}

// -- FastAlert Readers

/**
 * Checks if the replay is currently active.
 *
 * @return {boolean} true if the replay is active, false otherwise
 */
function isReplayActive() {
    return $(replayActiveSelector).length > 0;
}

/**
 * Check if the screener is visible.
 *
 * @return {boolean} true if the screener is not active, false otherwise
 */
function isScreenerVisible() {
    return $(screenerButtonSelector).attr('data-active') === 'false';
}

/**
 * Retrieve the timeframe currently Active.
 *
 * @return {type} Active Timeframe
 */
function getTimeframe() {
    return timeframeMap[styleIndex];
}

/**
 * Retrieves the style index for a given time frame index.
 *
 * @param {number} timeFrameIndex - The index of the time frame
 * @return {type} The style index for the given time frame index
 */
function getStyleIndex(timeFrameIndex) {
    // Get Current Sequence if not Frozen
    var sequence = freezeSequence || getSequence();
    return timeFrameBar[sequence][timeFrameIndex];
}
