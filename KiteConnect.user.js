// ==UserScript==
// @name         KiteConnect
// @namespace    aman
// @version      1.0
// @description  Kite Connector for TV
// @author       Amanpreet Singh
// @match        https://kite.zerodha.com/*
// @match        http://www.example.net/
// @match        https://in.tradingview.com/chart/*
// @match        https://in.investing.com/members-admin/alerts-feed
// @grant        GM_listValues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/sites/tv.js
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @run-at document-idle
// ==/UserScript==

const tvWatchChangeKey = "tvWatchChangeKey";
const alertClickedKey = "alertClicked";

if (location.host.includes("tradingview")) {
    tradingView();
} else if (location.pathname.includes("alerts-feed")) {
    alertFeed();
}

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

// -------------------------- TradingView -----------------------------
var summary;

function tradingView() {
    //Listen for Alert Clicks in AlertFeed
    GM_addValueChangeListener(
        alertClickedKey, (keyName, oldValue, newValue,) => {
            //Required for proper alert Opening
            openTicker('DHFL'); // DO NOT REMOVE DHFL Line
            openTicker(newValue);
        });

    // Summary UI Elements
    summary = document.createElement("p");
    summary.setAttribute("style", "font-size: 15px;position:absolute;top:" + 80 + "px;right:" + 460 + "px;");
    summary.innerHTML = "Summary:"
    document.body.appendChild(summary);


    //Onload TV WatchList Paint
    waitEE(watchListSelector, (el) => {

        // Paint WatchList Once Loaded
        paintTVWatchList();

        //Ensure Repaint on any change in WatchList
        nodeObserver(el, paintAll);

        //Ensure Name Repaint on TickerChange
        waitEE(nameSelector, (el) => {
            nodeObserver(el, paintDetails);
        });

        //Ensure Repaint on Screener Changes
        waitEE(screenerSelector, (el) => {
            attributeObserver(el, paintTVScreener);
        });

    });

    //console.log("KiteConnect Listeners Added")
}



