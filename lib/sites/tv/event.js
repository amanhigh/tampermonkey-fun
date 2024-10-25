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
        message('Recent Enabled', 'green')
    } else {
        recentTickers = new Set();
        paintScreener();
        paintAlertFeedEvent();
        message('Recent Disabled', 'red')
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

    //Perform Dry Run to get potential deletion count
    let dryRunCount = orderSet.dryRunClean();

    //Clean Order Set after unfilter completes
    setTimeout(() => {
        if (dryRunCount < 5) {
            //Auto update if deletion count is less than 5
            let cleanCount = orderSet.clean();
            orderSet.save();
        } else {
            //Prompt user for confirmation if deletion count is 5 or more
            let confirmDeletion = confirm(`Potential Deletions: ${dryRunCount}. Proceed with cleanup?`);
            if (confirmDeletion) {
                let cleanCount = orderSet.clean();
                orderSet.save();
            } else {
                message("Cleanup aborted by user.", 'red');
            }
        }
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
    pinSequence(getTicker());
    displaySequence();
}

function HandleAlertContextMenu(e) {
    // Disable Default Context Menu
    e.preventDefault();

    //Refresh Ticker
    onTickerChange();

    //Perform Audit
    auditCurrentTicker();
    DoAlertAudit();
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
    timeFrame = getTimeFrame(timeFrameIndex);
    $(`${timeframeSelector}:nth-child(${timeFrame.index})`).click();
}

/**
 * Clicks Favourite Toolbar on Given Index
 * @param index
 */
function SelectToolbar(index) {
    $(`${toolbarSelector}:nth(${index})`).click()
}

/**
 * Applies the appropriate style based on the current timeframe and the specified zone type.
 * 
 * @param {ZoneType} zoneType - The type of zone to apply, either ZoneType.DEMAND or ZoneType.SUPPLY
 */
function SelectTimeFrameStyle(zoneType) {
    // Combine the timeframe-specific style with the zone type symbol and apply it
    Style(timeFrame.style + zoneType.symbol);
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
    message("Auto Saving", 'green');
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
        message("Replay Cron Stoped", 'orange');
    }
}
