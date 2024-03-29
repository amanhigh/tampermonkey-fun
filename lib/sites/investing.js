//UI Ids
const hookId = 'aman-hook';

// Selectors
const alertTitleSelector = '.alertDataTitle';

//Mem Store
var nameToTickerMap;
var dataSiloInvesting = {};

// ---------------------------- ALERT CENTER -------------------------------

/**
 * To PreventDouble Load in Iframes
 */
function alertCenter() {
    //To PreventDouble Load in Iframes
    if (this.tab_id) { //Listen for Request to Get Alert Details

        //Add Auto Delete Confirmation Handler on all Delete Buttons
        $('.js-delete-btn').click(function () {
            waitClick('.js-delete');
        });

        setTimeout(investingBlackTheme, 1000);

        console.log("AlertCenter Setup Complete");
    }
}

// ---------------------------- ALERT FEED -------------------------------
function alertFeed() {
    if (this.uid) {
        //Button to add alert Handler on Scrolled Pages (Improve find Better Way)
        buildArea(areaId).appendTo('body').append(
            buildButton(hookId, 'Hook', handleHookButton)
        );

        //Listen to WatchList Changes
        GM_addValueChangeListener(
            tvWatchChangeEvent, (keyName, oldValue, newValue) => {
                //console.log (`Received new event: ${newValue}`);
                paintAlertFeed(newValue);
            });

        //Add AlertTicker Click Handler
        handleHookButton();
    }
    //console.log("AlertFeed", this);
}

/**
 * Apply Black Theme to Site
 * 
 * @returns {void}
 */
function investingBlackTheme() {
    //Alert Feed
    $('body').css('background-color', '#0f0f0f');
    $('span.alertDataDetails').css('color', 'white');
    $("div.alertWrapper").css('border', 'none');
    $('iframe').hide();

    //Alert List
    $("table.alertsTbl:first").css('color', 'white');
    $("div.floatingAlertWrapper").css("background-color", "black");
}

/**
 * Colors Alert Feed with Watchlist Names in TradingView
 * 
 * @param tickers
 * @param warn - Show Warning
 * 
 * @returns {void}
 */
function paintAlertFeed(tickers, warn = false) {
    let watchSet = new Set(tickers.watch);
    let recentSet = new Set(tickers.recent);

    $("div.alertNotifData > a").each((i, e) => {
        let alertName = e.text;
        let ticker = mapTickerFromAlertName(alertName);

        //Warn when Trimmed name missing in Name Map. Exclude Currencies
        if (warn && !ticker) {
            message(`Unable to Map: ${alertName}`.fontcolor('yellow'));
        }

        //Search Ticker and Color
        if (watchSet.has(ticker)) {
            $(e).css('color', 'orangered');
        } else if (recentSet.has(ticker)) {
            $(e).css('color', 'lime');
        } else {
            $(e).css('color', 'white');
        }
    });

    investingBlackTheme();
}

// -- Mappers
/**
 * Builds a Map of Alertfeed Name to TV Ticker
 * 
 * @param pairMap Investing Ticker to PairId, Name Map
 * @param tickerMap Map of TV Ticker to Investing Ticker
 * 
 * @returns alertNameToTvTickerMap
 */
function buildNameMap(pairMap, tickerMap) {
    let alertNameToTickerMap = {};

    //Load Investing to TV Ticker Map
    let investingToTVTickerMap = reverseMap(tickerMap);

    //Map Name to Ticker
    Object.keys(pairMap).forEach((investingTicker) => {
        //Investing Name matching Alert Feed
        let name = generateAlertFeedName(pairMap[investingTicker].name);

        //Map to TV Ticker if Present
        let tvTicker = investingToTVTickerMap[investingTicker];

        //Map Trimmed Name to TV/Investing Ticker
        alertNameToTickerMap[name] = tvTicker ? tvTicker : investingTicker;
    });

    return alertNameToTickerMap;
}

/**
 * Function to map ticker from an alert name.
 *
 * @param {string} alertName - the name of the alert
 * @return {string} the mapped ticker corresponding to the alert name
 */
function mapTickerFromAlertName(alertName) {
    // First Try Direct Mapping
    let ticker = dataSiloInvesting.alertNameMap[alertName];

    //If Not Found Search via Trimmed Name.
    if (!ticker) {
        let feedName = generateAlertFeedName(alertName);
        ticker = nameToTickerMap[feedName];
    }
    return ticker;
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
    let ticker = mapTickerFromAlertName(name);

    // Default Event with Ticker to Open It
    let alertClickEvt = new AlertClicked(ticker, null);

    // Add only Name to Do Alert mapping
    if (e.ctrlKey) {
        alertClickEvt = new AlertClicked(null, name);
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
    //Load Pair Map with Investing Names
    let pairMap = GM_getValue(pairMapStore, {});
    nameToTickerMap = buildNameMap(pairMap, dataSiloInvesting.tickerMap);

    //Paint Alert Feed With Current Watch List
    let tvTickers = GM_getValue(tvWatchChangeEvent);
    paintAlertFeed(tvTickers, true);
}