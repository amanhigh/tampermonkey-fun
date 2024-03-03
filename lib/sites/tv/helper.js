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


// -- Interactions

/**
 * Execute ReasonPrompt function which disables SwiftKeys, prompts for reasons,
 * and enables SwiftKeys after the prompt.
 *
 * @param {function} callback - The callback function to be executed with the reason returned from SmartPrompt
 * @return {void} 
 */
function ReasonPrompt(callback) {
    //Disable SwiftKeys
    toggleSwiftKeys(false);

    //Prompt
    SmartPrompt(reasons).then((reason) => {
        callback(reason);

        //Enable SwiftKeys
        toggleSwiftKeys(true);
    });
}

/**
 * Copies the given text to the clipboard and displays a message.
 *
 * @param {string} text - The text to be copied to the clipboard
 * @return {undefined} 
 */
function ClipboardCopy(text) {
    GM_setClipboard(text);
    message(`ClipCopy: ${text}`.fontcolor('yellow'))
}

/**
 * Closes the text box by clicking on the designated selector.
 *
 */
function CloseTextBox() {
    // Textbox Ok
    $(closeTextboxSelector).click()
}

/**
 * Opens Current Ticker Relative to Benchmark.
 * Eg. Stock to Nifty, Crypto to Bitcoin etc
 */
function OpenTicker() {
    let ticker = getTicker();
    let benchmark;
    switch (getExchange()) {
        case 'MCX':
            benchmark = 'MCX:GOLD1!'
            break;
        case NSE_EXCHANGE:
            benchmark = 'NIFTY'
            break;
        case 'BINANCE':
            benchmark = 'BINANCE:BTCUSDT'
            break;
        default:
            benchmark = 'XAUUSD'
    }
    applyTicker(`${ticker}/${benchmark}`)
}

/**
 * Toggles the scalp mode on and off and displays,
 * a message indicating the current mode.
 *
 * @param {void} None
 * @return {void} None
 */
function ToggleScalp() {
    scalpModeOn = !scalpModeOn;
    if (scalpModeOn) {
        message(`<span style="color: green;">ScalpMode Enabled</span>`);
    } else {
        message(`<span style="color: red;">ScalpMode Disabled</span>`);
    }
}

/**
 * Sets focus on the input element with the specified ID.
 *
 * @param {string} inputId - The ID of the input element to focus on
 * @return {void} 
 */
function focusInput() {
    $(`#${inputId}`).focus();
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

// -- Crons

/**
 * Function to perform auto saving and silo data save.
 */
function cronSave() {
    message("Auto Saving".fontcolor('green'));
    $(saveSelector).click();
    saveDataSilo();
}

/**
 * Function to handle replay functionality based on the current state of the replay.
 */
function cronReplay() {
    if (isReplayActive()) {
        let $playPause = $(replayPlayPauseSelector)
        let replayRunning = !$($playPause).find('svg > path').attr('d').includes('m10.997');

        // console.log(`Replay! Expected: ${runReplay}, Actual: ${replayRunning}`)

        //Match Expected and Actual State by Starting or Stopping Replay
        if (runReplay != replayRunning) {
            $playPause.click();
        }
    } else {
        //Stop Cron when Replay is Not Active
        clearInterval(replayCron);
        replayCron = false;
        message("Replay Cron Stoped".fontcolor('orange'));
    }
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
