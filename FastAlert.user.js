// ==UserScript==
// @name         FastAlert
// @namespace    aman
// @version      1.0
// @description  Fix Bad UI of Investing.com
// @author       Amanpreet Singh
// @match       https://in.tradingview.com/chart*
// @match       https://kite.zerodha.com*
// @match       https://in.investing.com/*
// @match       https://trello.com/*
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/constants.js
// @require      lib/ui.js
// @require      lib/client/kite.js
// @require      lib/client/investing.js
// @require      lib/client/trello.js
// @require      lib/sites/tv.js
// @require      lib/sites/investing.js
// @require      lib/sites/kite.js
// @require      lib/sites/trello.js
// @require      lib/sites/hotkeys.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==
//UI Coordinates

//-- Are we on the "interactive" page/site/domain or the "monitoring" one?
if (location.pathname.includes("alert-center")) {
    alertCenter();
} else if (location.pathname.includes("equities")) {
    equities();
} else if (location.host.includes("tradingview.com")) {
    tradingView();
} else if (location.pathname.includes("alerts-feed")) {
    alertFeed();
} else if (location.host.includes("kite.zerodha.com")) {
    kite();
} else if (location.host.includes("trello.com")) {
    trello();
}

//***************TRADING VIEW ********************

function tradingView() {
    setupFastAlertUI();
    loadTradingViewVars();

    document.addEventListener('keydown', doc_keyDown, false);

    //Register Ticker Change Listener
    //Using Seprate Selector as nameSelector has attribute changes in paint Name.
    waitEE(".description-3nAYicDA", function (e) {
        attributeObserver(e, onTickerChange);
    });

    //Register Alert Response Listener (After Alert Details Fetched)
    GM_addValueChangeListener(
        alertResponseKey, (keyName, oldValue, newValue) => {
            alertSummary(newValue.data);
        });

    //Listen for Alert Clicks in AlertFeed
    GM_addValueChangeListener(
        alertClickedEvent, (keyName, oldValue, newValue,) => {
            openTicker(newValue);
        });

    //Listen for Gtt Order Changes
    GM_addValueChangeListener(
        gttOrderEvent, (keyName, oldValue, newValue,) => {
            gttSummary(newValue);
        });

    //Wait for Title to Load and Fix to Signal Auto Hotkey
    waitEE("title", (el) => {
        //console.log('Observing Title: ' + el.innerHTML);
        nodeObserver(el, fixTitle);
    });

    //Onload TV WatchList Paint
    waitEE(`${watchListSelector} > div`, (el) => {
        //Ensure Repaint on scroll, add/remove to WatchList
        nodeObserver(el, onWatchListChange);

        //Ensure Repaint on Screener Changes
        message("Trying Screener Hook".fontcolor("yellow"));
        waitJEE(screenerSelector, (el) => {
            nodeObserver(el.get(0), onWatchListChange);

            message("Screener Hooked".fontcolor("green"));
        }, 10);

        //Paint WatchList, Screener etc
        onWatchListChange();

        // Load Alerts
        sendAlertRequest();

        //Missing FNO's Logging
        logMissingFno();
    }, 10);

    //Run AutoSave Cron
    setInterval(autoSave, 2 * 60 * 1000);
}

