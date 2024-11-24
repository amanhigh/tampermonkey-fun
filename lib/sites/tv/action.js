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
    SmartPrompt(reasons, overrides).then((reason) => {
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
    message(`ClipCopy: ${text}`, 'yellow')
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
function OpenBenchmarkTicker() {
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
    OpenTicker(`${ticker}/${benchmark}`)
}

// -- Toggles

/**
 * Title Change to Bridge witH AHK
 */
function EnableSwiftKey() {
    let liner = ' - SwiftKeys';
    //console.log('Processing Title: ' + document.title);
    //SwiftKey On and No Title Add It.
    let swiftEnabled = $(`#${swiftId}`).prop('checked');
    if (swiftEnabled && !document.title.includes('SwiftKeys')) {
        document.title = document.title + liner;
    } else if (!swiftEnabled && document.title.includes('SwiftKeys')) {
        // SwiftKey Off and Title present, Remove It.
        document.title = document.title.replace(liner, '');
    }
}

function FreezeSequence() {
    // Freeze Sequence to Current if Not Null
    if (freezeSequence) {
        freezeSequence = null;
        message("FreezeSequence Disabled", 'red');
    } else {
        freezeSequence = getSequence();
        message(`FreezeSequence: ${freezeSequence}`, 'yellow');
    }
}

/**
 * Toggles the flag by clicking on the symbol flag selector.
 * Handles screener painting by calling onWatchListChange.
 *
 */
function ToggleFlag() {
    $(symbolFlagSelector).click();
    //To handle screener painting.
    onWatchListChange();
}

// -- Others

/**
 * Function to clear all items.
 */
function ClearAll() {
    waitJClick(deleteArrowSelector, () => {
        waitJClick(deleteDrawingSelector)
    })
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
