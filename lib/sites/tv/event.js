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
        openTicker($(this).val().substring(0, $(this).val().length - 1));
        clearFields();
    }
}

//Fast Alert: Common
function onSymbolKeyPress(e) {
    if (e.keyCode === 13) {
        setMapping();
    }
}

function onPriceKeyPress(e) {
    if (e.keyCode === 13) {
        setAlert();
    }
}

//TV: Actions
function toggleReplay() {
    //Toggle Play Pause
    $(replayPlayPauseSelector).click();

    //Start Replay Cron if Replay Mode is Active & Cron is Stopped
    if (isReplayActive() && replayCron == false) {
        //Start Auto Replay Cron
        message("Replay Cron Started".fontcolor('orange'));
        replayCron = setInterval(autoReplay, 2 * 1000);
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

function clearAll() {
    waitJClick(deleteArrowSelector, () => {
        waitJClick(deleteDrawingSelector)
    })
}

function toggleFlag() {
    $(symbolFlagSelector).click();
    //To handle screener painting.
    onWatchListChange();
}

function autoAlert(func) {
    //Wait for Add Alert Context Menu Option
    waitJEE(autoAlertSelector, function (el) {
        let regExp = /[+-]?\d+(\.\d+)?/g;
        let match = regExp.exec(el.text());
        let altPrice = parseFloat(match[0])

        //Call Function with Char Alert Price
        // console.log("Text", el.text(),"Match", match, "Alert", altPrice);
        func(altPrice);
    });
}

//Hotkeys: TradingView Toolbar & Style
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 */
function timeframe(timeFrameIndex) {
    styleIndex = getStyleIndex(timeFrameIndex);
    $(`${timeframeSelector}:nth-child(${styleIndex})`).click();
}

/**
 * Clicks Favourite Toolbar on Given Index
 * @param index
 */
function favToolbar(index) {
    $(`${toolbarSelector}:nth(${index})`).click()
}

/**
 * Based on Style Index (Timeframe) and Style Type Apply Style
 * @param styleType
 */
function timeframeStyle(styleType) {
    if (styleType == "DZ")
        style(styleMap[styleIndex] + "DZ");
    else
        style(styleMap[styleIndex] + "SZ");
}

/**
 * Supply/Demand Zone Identifier
 * @param id
 */
function style(id) {
    // Template Selector
    waitClick(styleSelector, () => {
        //Clicks Style based on Index.
        waitJClick(`${styleItemSelector}:contains(${id})`)
    })
}
