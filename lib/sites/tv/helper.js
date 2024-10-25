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
 * Build reverse ticker map.
 * 
 * @return {void}
 * 
 */
function buildReverseTickerMap() {
    reverseTickerMap = {};
    for (let key in dataSilo.tickerMap) {
        reverseTickerMap[dataSilo.tickerMap[key]] = key;
    }
}

/**
 * Reverse map a TV ticker to its investing ticker.
 * 
 * @param {string} tvTicker - The TV ticker to be mapped
 * 
 * @return {string} The mapped investing ticker
 * 
 */
function reverseMapTicker(investingTicker) {
    let tvTicker = reverseTickerMap[investingTicker];
    if (tvTicker) {
        return tvTicker;
    } else {
        message(`Unable to reverse map ticker: ${investingTicker}`, 'red');
    }
    return investingTicker;
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

/**
 * Get all tickers that have been mapped in pairMapStore for Alerts.
 * @returns {Array<string>} Array of mapped tickers
 */
function getAllAlertTickers() {
    const pairSilo = GM_getValue(pairMapStore, {});
    return Object.keys(pairSilo);
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
    dataSilo.tvPinMap[tvTicker] = `${exchange}:${tvTicker}`;
    message(`Pinned Exchange: ${tvTicker} to ${exchange}`, 'yellow');
}


/**
 * Pin investing pair info to the pair silo cache
 * @param {string} investingTicker - The Investing ticker to cache
 * @param {PairInfo} pairInfo - The pair data to cache
 * @returns {void}
 */
function pinInvestingPair(investingTicker, pairInfo) {
    let pairSilo = GM_getValue(pairMapStore, {});
    pairSilo[investingTicker] = new PairInfo(pairInfo.name, pairInfo.pairId);
    GM_setValue(pairMapStore, pairSilo);
    message(`Pinned Investing Pair: ${investingTicker} -> ${pairInfo.name} (ID: ${pairInfo.pairId})`, 'yellow');
}

/**
 * Map investing pair info from the pair silo cache
 * @param {string} investingTicker - The Investing ticker to retrieve
 * @returns {PairInfo|null} - The cached pair data or null if not found
 */
function mapInvestingPair(investingTicker) {
    let pairSilo = GM_getValue(pairMapStore, {});
    if (pairSilo[investingTicker]) {
        return new PairInfo(pairSilo[investingTicker].name, pairSilo[investingTicker].pairId);
    }
    return null;
}

/**
 * Deletes a ticker's pair info from the pair map store
 * @param {string} ticker The ticker to remove
 */
function deletePairInfo(ticker) {
    const pairSilo = GM_getValue(pairMapStore, {});
    delete pairSilo[ticker];
    GM_setValue(pairMapStore, pairSilo);
}

/**
 * Pins a sequence to a TV ticker in the dataSilo object and displays a message.
 *
 * @param {string} tvTicker - The TV ticker to pin the sequence to.
 * @return {void} This function does not return anything.
 */
function pinSequence(tvTicker) {
    // Flip Currently Set Sequence
    let sequence = getSequence() === HIGH_SEQUENCE ? DEFAULT_SEQUENCE : HIGH_SEQUENCE;
    //Remove Mapping If Exists.
    if (dataSilo.sequenceMap[tvTicker]) {
        dataSilo.sequenceMap[tvTicker] = null;
    } else {
        dataSilo.sequenceMap[tvTicker] = sequence;
    }
    message(`Pinned Sequence: ${tvTicker} to ${sequence}`, 'yellow');
}

/**
 * Maps the TV ticker to the investing ticker if they are not already the same.
 *
 * @param {string} tvTicker - The TV ticker to be mapped.
 * @param {string} investingTicker - The investing ticker to map to.
 * @return {void} 
 */
function pinInvestingTicker(tvTicker, investingTicker) {
    dataSilo.tickerMap[tvTicker] = investingTicker;
    message(`Pinned Ticker (TV->Investing): ${tvTicker} -> ${investingTicker}`, 'yellow');
    mapAlert(investingTicker, getExchange());
}

/**
 * Process Action with Value.
 */
function processTextAction() {
    const tvTicker = getTicker();
    const input = $(`#${displayId}`).val();
    const exchange = getExchange();

    if (!input) return;

    const [action, value] = input.split('=');

    if (!action || !value) {
        displayHelpMessage();
        return;
    }

    const actionHandlers = {
        T: () => pinInvestingTicker(tvTicker, value),
        A: () => pinAlert(tvTicker, value),
        E: () => pinExchangeTicker(tvTicker, exchange)
    };

    const handler = actionHandlers[action];
    if (handler) {
        handler();
    } else {
        displayHelpMessage();
    }

    clearFields();
}

function pinAlert(tvTicker, value) {
    let exchange = '';
    let searchTerm = value;
    let investingTicker = mapTicker(tvTicker);

    if (!searchTerm) {
        displayHelpMessage();
        return;
    }

    // Check if exchange is specified (format: EXCHANGE:TICKER)
    if (value.includes(':')) {
        [exchange, searchTerm] = value.split(':');
    }

    mapAlert(investingTicker, exchange, searchTerm);
}

function displayHelpMessage() {
    const help = `
    InvestingTicker: T=DHLF<br/>
    PinExchange: E=NSE(Auto Picks Current Exchange)<br/>
    PinAlert: A=Reliance Industries or A=NSE:Reliance Industries
    `;
    message(`Invalid Map Format. ${help}`, "red");
}

// -- Support Functions

function displaySequence() {
    let sequence = getSequence();
    let message = getTicker() + ':' + sequence;
    $(`#${displayId}`).val(message);
    // Background Color Blue
    if (sequence === HIGH_SEQUENCE) {
        $(`#${displayId}`).css("background-color", "maroon");
    } else {
        $(`#${displayId}`).css("background-color", "black");
    }
}

/**
 * Clears the input fields.
 *
 * @return {void} 
 */
function clearFields() {
    $(`#${displayId}`).val("");
    $(`#${inputId}`).val("");
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

    //Rebuild Reverse Ticker Map from DataSilo Ticker Map
    buildReverseTickerMap();
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
    // Wait for Add Alert Context Menu Option
    waitJEE(autoAlertSelector, function (el) {
        let regExp = /[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;
        let match = regExp.exec(el.text());
        let altPrice = parseFloat(match[0].replace(/,/g, ''));

        // Call Function with Cleaned Alert Price
        // console.log("Text", el.text(), "Match", match, "Alert", altPrice);
        callback(altPrice);
    });
}

/**
 * @returns {number|null} - The last traded price as a float, or null if parsing fails.
 */
function getLastTradedPrice() {
    // Get the text from the selector
    const ltpElement = $(ltpSelector);
    if (ltpElement.length === 0) {
        console.error('LTP element not found');
        return null;
    }

    const ltpText = ltpElement.text();
    // Remove any commas and whitespace
    const cleanedText = ltpText.replace(/,|\s/g, '');
    // Parse the cleaned text to a float
    const price = parseFloat(cleanedText);

    if (isNaN(price)) {
        console.error('Failed to parse LTP:', ltpText);
        return null;
    }

    return price;
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
 * Retrieves the time frame object for a given time frame index.
 *
 * @param {number} timeFrameIndex - The index of the time frame (0-3)
 * @return {Object} The time frame object containing properties like index, style, and name
 */
function getTimeFrame(timeFrameIndex) {
    // Get current sequence if not frozen
    var sequence = freezeSequence || getSequence();
    return timeFrameBar[sequence][timeFrameIndex];
}
