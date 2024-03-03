// -- Feature Sets

// Event Handlers
function onWatchListChange() {
    waitOn("watchListChangeEvent", 2, () => {
        resetWatchList();

        saveWatchListTickers();
        paintWatchList();
        paintScreener();
        paintName();
        paintAlertFeedEvent();

        filterChain.forEach((f) => filterWatchList(f));
        // console.log("WatchList Changed");
    })
}

function onTickerChange() {
    //HACK: Make Event Based when New Ticker Appears
    waitOn("tickerChange", 150, () => {
        //console.log('Ticker Changed');

        AlertRefreshLocal()

        //Fetch Orders
        gttSummary(GM_getValue(gttOrderEvent, {}));

        //Paint Name
        paintName();

        //Record Recent Ticker
        let recentEnabled = $(`#${recentId}`).prop('checked');
        let ticker = getTicker();
        if (recentEnabled && !recentTickers.has(ticker)) {
            recentTickers.add(ticker);
            paintScreener();
            paintAlertFeedEvent();
        }
    });
}

function onRefresh() {
    //Refresh Ticker
    onTickerChange();

    //Refresh Alerts
    ForceRefreshAlerts()

    //Clean Order Set after unfilter completes
    setTimeout(() => {
        let cleanCount = orderSet.clean();
        //Prompt in case of mass deletion to prevent accidental deletion
        cleanCount > 4 && confirm(`Multiple Items Deleted: ${cleanCount}. Save ?`) && orderSet.save();
    }, 1000);
}

function onRecentTickerReset() {
    let recentEnabled = $(`#${recentId}`).prop('checked');
    if (recentEnabled) {
        message('Recent Enabled'.fontcolor('green'))
    } else {
        recentTickers = new Set();
        paintScreener();
        paintAlertFeedEvent();
        message('Recent Disabled'.fontcolor('red'))
    }
}

function onInputChange() {
    //Open Ticker in InputBox (Pasted from Clipboard)
    if ($(this).val().endsWith("!")) {
        applyTicker($(this).val().substring(0, $(this).val().length - 1));
        clearFields();
    }
}

// -- Text Handlers

/**
 * Handle the input submit event.
 *
 * @param {event} e - The event object
 * @return {void} 
 */
function HandleInputSubmit(e) {
    if (e.keyCode === ENTER_KEY_CODE) {
        setMapping();
    }
}

/**
 * Handles the submission of the price.
 *
 * @param {object} e - the event object
 * @return {void} 
 */
function HandlePriceSubmit(e) {
    if (e.keyCode === ENTER_KEY_CODE) {
        HandleTextBoxCreateAlert();
    }
}

// -- Actions

/**
 * Function to toggle replay functionality.
 *
 * No parameters
 * No return value
 */
function ToggleReplay() {
    //Toggle Play Pause
    $(replayPlayPauseSelector).click();

    //Start Replay Cron if Replay Mode is Active & Cron is Stopped
    if (isReplayActive() && replayCron == false) {
        //Start Auto Replay Cron
        message("Replay Cron Started".fontcolor('orange'));
        replayCron = setInterval(cronReplay, 2 * 1000);
    }

    //Toggle Expected Replay State with approprioate messages if in Replay Mode
    if (replayCron) {
        if (runReplay) {
            message("Exiting Replay Mode".fontcolor('yellow'));
            //Indicate Cron to Stop Replay
            runReplay = false;
        } else {
            message("Entering Replay Mode".fontcolor('green'));
            //Indicate Cron to Start Replay
            runReplay = true;
        }
    }
}

/**
 * Function to clear all items.
 */
function ClearAll() {
    waitJClick(deleteArrowSelector, () => {
        waitJClick(deleteDrawingSelector)
    })
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

// -- Toolbars
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 */
function SelectTimeframe(timeFrameIndex) {
    styleIndex = getStyleIndex(timeFrameIndex);
    $(`${timeframeSelector}:nth-child(${styleIndex})`).click();
}

/**
 * Clicks Favourite Toolbar on Given Index
 * @param index
 */
function SelectToolbar(index) {
    $(`${toolbarSelector}:nth(${index})`).click()
}

/**
 * Based on Style Index (Timeframe), Apply Style
 * @param styleType DZ/SZ
 */
function SelectTimeFrameStyle(styleType) {
    if (styleType == "DZ")
        Style(styleMap[styleIndex] + "DZ");
    else
        Style(styleMap[styleIndex] + "SZ");
}

/**
 * Apply Style with Given Name
 * @param styleName
 */
function Style(styleName) {
    // Template Selector
    waitClick(styleSelector, () => {
        //Clicks Style based on Index.
        waitJClick(`${styleItemSelector}:contains(${styleName})`)
    })
}
