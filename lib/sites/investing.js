//Events
const tvWatchChangeEvent = "tvWatchChangeEvent";
const alertClickedEvent = "alertClickedEvent";
const tokenChangedEvent = "tokenChangedEvent";

//UI Ids
const hookId = 'aman-hook';

//Mem Store
var nameMap;

//************** Investing *********************
function alertCenter() {
    //To PreventDouble Load in Iframes
    if (this.tab_id) { //Listen for Request to Get Alert Details
        GM_addValueChangeListener(alertRequestKey, (keyName, oldValue, newValue) => {
            // console.log('Alert request', newValue);
            getAlerts(newValue.id, GM_getValue(tokenChangedEvent), (alrts) => {
                // console.log('Alert Fetched', alrts);
                GM_setValue(alertResponseKey, {data: getTriggers(alrts), date: new Date()});
            })
        });

        //Add Auto Delete Confirmation Handler on all Delete Buttons
        $('.js-delete-btn').click(function () {
            waitClick('.js-delete');
        });

        console.log("AlertCenter Listners Added")
    }
}

function equities() {
    //Wait For Alert Bell
    waitEE('.add-alert-bell-button', () => {
        captureToken();

        // getAlerts(17984, GM_getValue(tokenKey), (alrts) => {
        //     console.log(getTriggers(alrts));
        // })
    });
}

// ---------------------------- ALERT FEED -------------------------------
function alertFeed() {
    if(this.uid) {
        nameMap = buildNameMap();

        //Button to add alert Handler on Scrolled Pages (Improve find Better Way)
        buildArea(areaId).appendTo('body').append(
            buildButton(hookId, 'Hook', onHookClick)
        );

        //Listen to WatchList Changes
        GM_addValueChangeListener(
            tvWatchChangeEvent, (keyName, oldValue, newValue) => {
                //console.log (`Received new event: ${newValue}`);
                paintAlertFeed(newValue);
            });

        //Add AlertTicker Click Handler
        onHookClick();
    }
    //console.log("AlertFeed", this);
}

/**
 * Colors Alert Feed with Watchlist Names in TradingView
 * @param tickers
 */
function paintAlertFeed(tickers, warn = false) {
    // console.log('Painting Alert Feed', tickers, nameMap);
    let watchSet = new Set(tickers.watch);
    let recentSet = new Set(tickers.recent);

    $("div.alertNotifData > a").each((i, e) => {
        //Map Trimmed Name to Ticker
        let trimmedName = trimInvestingName(e.innerHTML);
        let ticker = nameMap[trimmedName];

        //Warn when Trimmed name missing in Name Map. Exclude Currencies
        if (warn && !ticker && !trimmedName.includes("/")) {
            message(`Unable to Map: ${e.innerHTML}`.fontcolor('yellow'));
        }

        //Search Ticker and Color
        if (watchSet.has(ticker)) {
            $(e).css('color', 'orangered');
        } else if (recentSet.has(ticker)) {
            $(e).css('color', 'green');
        } else {
            $(e).css('color', 'white');
        }
    });
}

function trimInvestingName(name) {
    return name.replace(' Ltd.', '').replace(' Ltd', '').trim().split(' ').slice(0, 2).join('+');
}

// Handlers

/**
 * Overrides Onclick of Alerts in Feed. Opens Ticker
 * @param e
 */
function onAlertClickHandler(e) {
    e.preventDefault();
    //console.log('Posting AlertTicker: ' + this.innerHTML);
    GM_setValue(alertClickedEvent, trimInvestingName(this.text));
}

/**
 * Handler for Hook Button
 */
function onHookClick() {
    //Override OnClick for All Alerts
    $('.alertDataTitle').click(onAlertClickHandler);

    //Paint Alert Feed With Current Watch List
    paintAlertFeed(GM_getValue(tvWatchChangeEvent), true);
}

// ---------------------------- EQUITIES -------------------------------
/**
 * Overrides SetRequestHeader to Capture 'Token' Header
 */
function captureToken() {
    XMLHttpRequest.prototype.realSetRequest = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
        if (k === 'token') {
            GM_setValue(tokenChangedEvent, v);
            message('Token Captured'.fontcolor('yellow'));
        }
        this.realSetRequest(k, v);
    };
}