// -- Feature Sets

// Event Handlers
function onWatchListChange() {
    waitOn("watchListChangeEvent", 2, () => {
        resetWatchList();

        updateWatchListSet();
        paintWatchList();
        paintScreener();
        paintName();
        paintAlertFeedEvent();

        filterChain.forEach((f) => FilterWatchList(f));
        // console.log("WatchList Changed");
    })
}

function onTickerChange() {
    //HACK: Make Event Based when New Ticker Appears
    waitOn("tickerChange", 150, () => {
        //console.log('Ticker Changed');

        AlertRefreshLocal()

        //Fetch Orders        
        const gttOrderMap = GttOrderMap.loadFromGMValue(gttOrderEvent);
        
        gttSummary(gttOrderMap);

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

        //Load Sequence
        displaySequence();
    });
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
    // HACK: Improved Ends With Symbol
    if ($(this).val().endsWith("xox")) {
        OpenTicker($(this).val().substring(0, $(this).val().length - 3));
        clearFields();
    }
}

// -- Button Handlers


/**
 * Handles Refresh Button Click
 *
 * @param None
 * @return None
 */
function HandleRefreshButton() {
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

/**
 * Handle the alert button event.
 *
 * @param {Event} e - the event object
 * @return {void} 
 */
function HandleAlertButton(e) {
    if (e.ctrlKey) {
        //Map Current Exchange to Current TV Ticker
        pinExchangeTicker(getTicker(), getExchange());
    } else {
        createHighAlert();
    }
}

function HandleJournalButton(e) {
    toggleUI(`#${journalId}`);
}

function HandleSequenceSwitch(e) {
    toggleSequence(getTicker());
    displaySequence();
}

function HandleJournalButtonMenu(e) {
    GetClip((txt) => {
        if (txt.length > 0 && txt.length < 15) {
            OpenTicker(txt);
        } else {
            console.log(`Non Ticker: ${txt}`)
        }
    })
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
        processTextAction();
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