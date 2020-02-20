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

// ---------------------------- KITE -------------------------------
const kiteWatchListSelector = ".vddl-list";
const storageWatchInfo = "__storejs_kite_marketwatch/watchInfo";
const storageCurrentList = "__storejs_kite_marketwatch/currentWatchId";

function kite() {
    //Listen to Any WatchList Change
    waitEE(kiteWatchListSelector, (el) => {
        nodeObserver(el, onKiteWatchChange)
    });
}

/**
 *  Sends Kite WatchList Change Event
 */
function onKiteWatchChange() {
    //Read Current WachInfo from Local Store
    let watchInfo = JSON.parse(localStorage.getItem(storageWatchInfo));

    //Read Current index and Symbols in Watch List
    let index = JSON.parse(localStorage.getItem(storageCurrentList))
    //console.log(index,names,watchInfo);

    //Update Names in Current WatchList
    watchInfo[index] = $('.nice-name').map(function () {
        return this.innerHTML;
    }).toArray();

    //Write to Local Store for future reference
    localStorage.setItem(storageWatchInfo, JSON.stringify(watchInfo));

    //Send Event to Trading View
    GM_setValue(kiteWatchChangeKey, watchInfo);
    //console.log("WatchList Change Detected");
}

// -------------------------- TradingView -----------------------------
var summary;

function tradingView() {
    //Listen for Kite WatchList Changes
    GM_addValueChangeListener(
        kiteWatchChangeKey, () => {
            paintTVWatchList();
        });

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

        //Onload Details Paint
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

function updateSummary() {
    let msg = "Summary: "
    let watchInfo = GM_getValue(kiteWatchChangeKey);
    //console.log(watchInfo);

    for (let i = 0; i < 5; i++) {
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
    //Reset Color
    $(`.${watchListSymbolSelector}`).css('color', 'white');
    //Paint Index
    paint(watchListSymbolSelector, indexSymbols, colorList[6]);
    //Paint Kite
    paintTickers(watchListSymbolSelector);
    updateSummary();

    //To be Used on Alert Feed; Delay Required as during paint it has nse:symbol but we require name.
    setTimeout(() => GM_setValue(tvWatchChangeKey, getWatchListNames()), 1000);
    //console.log("Painting WatchList");
}

/**
 * Paints TV Screener Elements.
 */
function paintTVScreener() {
    //Must Run in this Order- Clear, WatchList, Kite
    $(`.${screenerSymbolSelector}`).css('color', 'white');

    paint(screenerSymbolSelector, getWatchListTickers(), colorList[5]);
    paintTickers(screenerSymbolSelector);
    //console.log("Painting Screener");
}

/**
 * Paints Ticker Name in Detail Section
 */
function paintDetails() {
    let ref = $(".dl-header > div:nth-child(1) > a:nth-child(2)").attr('href')
    if (ref) {
        let symbol = ref.split("-")[1].replace('/', '');
        let $target = $(nameSelector);
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
    let watchInfo = GM_getValue(kiteWatchChangeKey);
    //console.log(watchInfo);

    for (let i = 0; i < 5; i++) {
        paint(selector, watchInfo[i], colorList[i]);
    }
}

function paint(selector, symbols, colour) {
    for (const sym of symbols) {
        $(`.${selector}:contains("${sym}")`).css('color', colour);
    }
}