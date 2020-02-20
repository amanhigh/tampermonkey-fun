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
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @run-at document-idle
// ==/UserScript==

const kiteWatchChangeKey = "kiteWatchChangeKey";
const tvWatchChangeKey = "tvWatchChangeKey";
const alertClickedKey = "alertClicked";
const nameLength = 10;
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'greenyellow', 'brown'];
const indexSymbols = ['CNXMIDCAP', 'CNXSMALLCAP', 'IXIC', 'DXY', 'NIFTY', 'NIFTYJR', 'US10Y', 'USOIL', 'USDINR', 'XAUUSD', 'XAGUSD', 'SHCOMP'];

if (location.host.includes("tradingview")) {
    tradingView();
} else if (location.pathname.includes("alerts-feed")) {
    alertFeed();
} else {
    kite();
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
        tvWatchChangeKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
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
};

// ---------------------------- KITE -------------------------------
function kite() {
    //Listen to Any WatchList Change
    waitEE(".vddl-list", (el) => {
        nodeObserver(el, onKiteWatchChange)
    });
}

/**
 *  Sends Kite WatchList Change Event
 */
function onKiteWatchChange() {
    //Read Current WachInfo from Local Store
    var watchInfo = JSON.parse(localStorage.getItem("__storejs_kite_marketwatch/watchInfo"));

    //Read Current index and Symbols in Watch List
    var index = JSON.parse(localStorage.getItem("__storejs_kite_marketwatch/currentWatchId"))
    var names = $('.nice-name').map(function () {
        return this.innerHTML;
    }).toArray();

    //console.log(index,names,watchInfo);

    //Update Names in Current WatchList
    watchInfo[index] = names;

    //Write to Local Store for future reference
    localStorage.setItem("__storejs_kite_marketwatch/watchInfo", JSON.stringify(watchInfo));

    //Send Event to Trading View
    GM_setValue(kiteWatchChangeKey, watchInfo);
    //console.log("WatchList Change Detected");
}

// -------------------------- TradingView -----------------------------
var summary;

function tradingView() {
    //Listen for Kite WatchList Changes
    GM_addValueChangeListener(
        kiteWatchChangeKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
            paintTVWatchList();
        });

    //Listen for Alert Clicks in AlertFeed
    GM_addValueChangeListener(
        alertClickedKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
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
    //TODO: Constants for Selectors
    waitEE(".tree-T6PqyYoA", (el) => {

        // Paint WatchList Once Loaded
        paintTVWatchList();

        //Ensure Repaint on any change in WatchList
        nodeObserver(el, paintAll);

        //Onload Details Paint
        waitEE(".dl-header-symbol-desc", (el) => {
            nodeObserver(el, paintDetails);
        });

        //Ensure Repaint on Screener Changes
        waitEE(".tv-data-table", (el) => {
            attributeObserver(el, paintTVScreener);
        });

    });

    //console.log("KiteConnect Listeners Added")
}

function updateSummary() {
    var msg = "Summary: "
    var watchInfo = GM_getValue(kiteWatchChangeKey);
    //console.log(watchInfo);

    for (var i = 0; i < 5; i++) {
        msg += watchInfo[i].length.toString().fontcolor(colorList[i]) + '|';
    }
    msg += getWatchListTickers().length.toString().fontcolor(colorList[5]);
    summary.innerHTML = msg;
    //console.log(msg);

}

// TradingView: Painters
function paintAll() {
    paintTVWatchList();
    paintTVScreener();
    paintDetails();
}

/**
 * Paints TV WatchList
 */
function paintTVWatchList() {
    var sel = 'symbolNameText-2EYOR9jS';
    //Reset Color
    $(`.${sel}`).css('color', 'white');
    //Paint Index
    paint(sel, indexSymbols, colorList[6]);
    //Paint Kite
    paintTickers(sel);
    updateSummary();

    //To be Used on Alert Feed; Delay Required as during paint it has nse:symbol but we require name.
    setTimeout(() => GM_setValue(tvWatchChangeKey, getWatchListNames()), 1000);
    //console.log("Painting WatchList");
}

/**
 * Paints TV Screener Elements.
 */
function paintTVScreener() {
    var sel = 'tv-screener__symbol';

    //Must Run in this Order- Clear, WatchList, Kite
    $(`.${sel}`).css('color', 'white');

    paint(sel, getWatchListTickers(), colorList[5]);
    paintTickers(sel);
    //console.log("Painting Screener");
}

/**
 * Paints Ticker Name in Detail Section
 */
function paintDetails() {
    var ref = $(".dl-header > div:nth-child(1) > a:nth-child(2)").attr('href')
    if (ref) {
        var symbol = ref.split("-")[1].replace('/', '');
        var $target = $(".dl-header-symbol-desc");
        //Check if href contains symbol then paint stock name
        if (getWatchListTickers().includes(symbol)) {
            $target.css('color', colorList[5]);
        } else {
            $target.css('color', 'white');
        }

        //console.log("Painting Details");
    }
}

//TradingView: PaintHelpers
function paintTickers(selector) {
    var watchInfo = GM_getValue(kiteWatchChangeKey);
    //console.log(watchInfo);

    for (var i = 0; i < 5; i++) {
        paint(selector, watchInfo[i], colorList[i]);
    }
}

function paint(selector, symbols, colour) {
    for (const sym of symbols) {
        $(`.${selector}:contains("${sym}")`).css('color', colour);
    }
}

//TradingView: Getters
function getWatchListTickers() {
    return $('.symbolNameText-2EYOR9jS').toArray().map(s => s.innerHTML);
}

function getWatchListNames() {
    return $('div.symbol-17NLytxZ').map((i, e) => e.title.split(',')[0].toLowerCase().substring(0, nameLength)).toArray();
}

//TradingView: Ticker Actions
/**
 * Opens Given Ticker in Trading View.
 * @param ticker
 */
function openTicker(ticker) {
    waitInput('input', ticker);
    waitClick("td.symbol-edit-popup-td");
}