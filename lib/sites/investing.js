//UI Ids
const hookId = 'aman-hook';

// Selectors
const alertTitleSelector = '.alertDataTitle';

//Mem Store
var dataSiloInvesting = {};
let investingToTVTickerMap = {};

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
    $("div.alertWrapper").css('border', 'none');
    $('iframe').hide();

    //Alert List
    $("div.floatingAlertWrapper").css("background-color", "black");
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
    let watchSet = new Set(watchChangeEvent.tickers);
    let recentSet = new Set(watchChangeEvent.recent);

    $("div.alertNotifData > a").each((i, e) => {
        let alertName = e.text;
        let tvTicker = mapAlertToTvTicker(alertName);

        //Warn when Trimmed name missing in Name Map. Exclude Currencies
        if (warn && !tvTicker) {
            message(`Unable to Map: ${alertName}`, 'yellow');
        } else {
            //Search Ticker and Color
            if (watchSet.has(tvTicker)) {
                $(e).css('color', 'orangered');
            } else if (recentSet.has(tvTicker)) {
                $(e).css('color', 'lime');
            } else {
                $(e).css('color', 'white');
            }
        }

    });

    investingBlackTheme();
}

/**
 * Function to map ticker from an alert name.
 *
 * @param {string} alertName - the name of the alert
 * @return {string} the mapped ticker corresponding to the alert name
 */
function mapAlertToTvTicker(alertName) {
    // Extract Ticker from Alert Feed Item
    let investingTicker = extractInvestingTicker(alertName);

    // Map to TV Ticker
    return investingToTVTickerMap[investingTicker];
}

function extractInvestingTicker(inputString) {
    const match = inputString.match(/\(([^)]+)\)/);
    return match ? match[1] : inputString;
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
