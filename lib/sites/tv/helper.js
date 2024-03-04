// -- Ticker Mappers

function getMappedTicker() {
    return resolveTicker(getTicker());
}

function resolveTicker(tvTicker) {
    // Use Investing Ticker if available
    let investingTicker = dataSilo.tickerMap[tvTicker];
    if (investingTicker) {
        tvTicker = investingTicker;
    }

    //console.log(tvTicker,investingTicker);
    return tvTicker;
}

function mapTicker(tvTicker, investingTicker) {
    if (tvTicker !== investingTicker) {
        dataSilo.tickerMap[tvTicker] = investingTicker;
        message(`Mapped Ticker: ${tvTicker} to ${investingTicker}`.fontcolor('yellow'));
    }
}

function pinTicker(tvTicker, pinnedTvTicker) {
    dataSilo.tvPinMap[tvTicker] = pinnedTvTicker;
    message(`Pinned Ticker: ${tvTicker} to ${pinnedTvTicker}`.fontcolor('yellow'));
}

function mapAlertName(tvTicker, alertName) {
    dataSilo.alertNameMap[alertName] = tvTicker;
    message(`Mapped Alert Name: ${alertName} to ${tvTicker}`.fontcolor('yellow'));
}

/**
 * Map Current TV Ticker to
 * Investing TickerOnly: T=DHLF
 * Investing TickerWithExchange: E=NSE:DHFL
 * Investing AlertName: A=Divis Lab
 * TradingView PinExchange: P=NSE
 */
function setMapping() {
    //Get TradingView Ticker
    let tvTicker = getTicker();
    //Get Symbol Input
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
                    mapTicker(tvTicker, value);
                    break;
                case "E":
                    //Extract Exchange and Symbol
                    let exchangeSplit = value.split(":");
                    let exchange = exchangeSplit[0];
                    let symbol = exchangeSplit[1];

                    //Map Symbol to Current TV Ticker
                    mapTicker(tvTicker, symbol);
                    //Set Proper Pair Id based on Exchange
                    searchSymbol(symbol, () => {
                    }, exchange)
                    break;
                case "A":
                    //Map AlertName to Current TV Ticker
                    mapAlertName(tvTicker, value);
                    break;
                case "P":
                    //Map Passed Exchange (EXCH:Ticker) to Current TV Ticker
                    pinTicker(tvTicker, `${value}:${tvTicker}`);
            }
        } else {
            message("Invalid Map Format. Provide Action=Value".fontcolor("red"))
        }

        //Clear Inputs
        clearFields();
    }
}

// -- Support Functions

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
 * Opens Given Ticker in Trading View.
 * @param ticker
 */
function applyTicker(ticker) {
    // HACK: Move to Public Function
    //Resolve Ticker to Pinned Ticker If Present
    let pinTicker = dataSilo.tvPinMap[ticker]
    ticker = pinTicker ? pinTicker : ticker;

    //Opens Search Box
    waitClick(tickerSelector)

    //Open Relative Ticker
    waitInput(searchPopupSelector, ticker);
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
    var styleName = getExchange() === NSE_EXCHANGE ? NSE_EXCHANGE : "DEFAULT";
    styleName = scalpModeOn ? "SCALP" : styleName;

    // console.log(styleName, index, timeFrameBar[styleName][index])
    return timeFrameBar[styleName][timeFrameIndex];
}
