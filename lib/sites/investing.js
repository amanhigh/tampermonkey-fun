const tvWatchChangeKey = "tvWatchChangeKey";
const alertClickedKey = "alertClicked";

// ---------------------------- ALERT FEED -------------------------------
function alertFeed() {

    //Button to add alert Handler on Scrolled Pages (Improve find Better Way)
    var fastGtt = document.createElement("input");
    fastGtt.type = "button";
    fastGtt.value = "Hook";
    fastGtt.onclick = function () {
        $('.alertDataTitle').click(onAlertClickHandler);
    };
    // TODO: Use Percent based alighnment
    fastGtt.setAttribute("style", "font-size: 10px;position:absolute;top:" + 100 + "px;right:" + 200 + "px;");
    document.body.appendChild(fastGtt);

    //Listen to WatchList Changes
    GM_addValueChangeListener(
        tvWatchChangeKey, (keyName, oldValue, newValue) => {
            //console.log (`Received new event: ${newValue}`);
            paintAlertFeed(newValue);
        });

    paintAlertFeed(GM_getValue(tvWatchChangeKey));

    //Add AlertTicker Click Handler
    $('.alertDataTitle').click(onAlertClickHandler);
}

/**
 * Colors Alert Feed with Watchlist Names in TradingView
 * @param names
 */
function paintAlertFeed(names) {
    //console.log('Painting Alert Feed', names);

    $("div.alertNotifData > a").each((i, e) => {
        //Check if Alert Name exists in Watch List Names;
        if (names.includes(e.innerHTML.toLowerCase().substring(0, nameLength))) {
            $(e).css('color', 'orangered');
        } else {
            $(e).css('color', 'white');
        }
    });
}

/**
 * Overrides Onclick of Alerts in Feed. Opens Ticker
 * @param event
 */
function onAlertClickHandler(event) {
    event.preventDefault();
    //console.log('Posting AlertTicker: ' + this.innerHTML);
    GM_setValue(alertClickedKey, this.text);
}