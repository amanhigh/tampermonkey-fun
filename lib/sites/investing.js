//Events
const tvWatchChangeEvent = "tvWatchChangeEvent";
const alertClickedEvent = "alertClickedEvent";
const tokenChangedEvent = "tokenChangedEvent";

//UI Ids
const hookId = 'aman-hook';

// ---------------------------- ALERT FEED -------------------------------
function alertFeed() {

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

/**
 * Colors Alert Feed with Watchlist Names in TradingView
 * @param names
 */
function paintAlertFeed(names) {
    //console.log('Painting Alert Feed', names);

    $("div.alertNotifData > a").each((i, e) => {
        //Check if Alert Name exists in Watch List Names;
        if (names.includes(trimInvestingName(e.innerHTML))) {
            $(e).css('color', 'orangered');
        } else {
            $(e).css('color', 'white');
        }
    });
}

function trimInvestingName(name) {
    return name.replace(' Ltd.', '').replace(' Ltd', '').trim().substring(0, nameLength)
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

    //Mark Clicked
    $(this).css('color', 'green')
}

/**
 * Handler for Hook Button
 */
function onHookClick() {
    //Override OnClick for All Alerts
    $('.alertDataTitle').click(onAlertClickHandler);

    //Paint Alert Feed With Current Watch List
    paintAlertFeed(GM_getValue(tvWatchChangeEvent));
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
            message('Token Captured');
        }
        this.realSetRequest(k, v);
    };
}