// Selectors
const alertTitleSelector = '.alertDataTitle';

// FIXME: #A Migrate to Typscript

// ---------------------------- ALERT FEED -------------------------------
function alertFeed() {
    if (this.uid) {
        //Add AlertTicker Click Handler
        handleHookButton();
    }
}

/**
 * Colors Alert Feed with Watchlist Names in TradingView
 * 
 * @param watchChangeEvent
 * @param warn - Show Warning
 * 
 * @returns {void}
 */
function paintAlertFeed(watchChangeEvent, warn = false) {
    $("div.alertNotifData > a").each((i, e) => {
        //Warn when Trimmed name missing in Name Map. Exclude Currencies
        if (warn && !tvTicker) {
            message(`Unable to Map: ${alertName}`, 'yellow');
        } 
    });

}

// -- Handlers

/**
 * Overrides Onclick of Alerts in Feed. 
 * 
 * Opens Ticker or Maps Alert (Ctrl)
 * @param e
 * 
 * @returns {void}
 */
function handleAlertClick(e) {
    e.preventDefault();
    let name = this.text;
    let tvTicker = mapAlertToTvTicker(name);
    let investingTicker = extractInvestingTicker(name);
    let ticker = tvTicker ? tvTicker : name;

    // Default Event with Available Ticker to Open It
    let alertClickEvt = new AlertClicked(ticker, null);

    // Add only Name to Do Alert mapping
    if (e.ctrlKey) {
        alertClickEvt = new AlertClicked(null, investingTicker);
    }
    //console.log('AlertClickEvt: ', alertClickEvt);
    GM_setValue(alertClickedEvent, alertClickEvt);
}

/**
 * Handler for Hook Button.
 * 
 * @returns {void}
 */
function handleHookButton() {
    //Override OnClick for All Alerts
    $(alertTitleSelector).click(handleAlertClick);

    //Reload DataSilo & Trimmed Map to in memory Cache.
    dataSiloInvesting = GM_getValue(dataSiloStore, {});

    //Load Investing to TV Ticker Map
    investingToTVTickerMap = reverseMap(dataSiloInvesting.tickerMap);

    //Paint Alert Feed With Current Watch List
    let watchChangeEevent = GM_getValue(tvWatchChangeEvent);
    paintAlertFeed(watchChangeEevent, true);
}
