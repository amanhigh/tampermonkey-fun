// ==UserScript==
// @name         FastAlert
// @namespace    aman
// @version      1.1
// @description  Fix Bad UI of Investing.com
// @author       Amanpreet Singh
// @match       https://in.tradingview.com/chart*
// @match       https://kite.zerodha.com/*
// @match       https://in.investing.com/*
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant       GM_setClipboard
// @require      lib/sites/tv/const.js
// @require      lib/library.js
// @require      lib/ui.js
// @require      lib/client/kite.js
// @require      lib/client/investing.js
// @require      lib/client/kohan.js
// @require      lib/sites/tv/action.js
// @require      lib/sites/tv/alert.js
// @require      lib/sites/tv/core.js
// @require      lib/sites/tv/event.js
// @require      lib/sites/tv/helper.js
// @require      lib/sites/tv/models.js
// @require      lib/sites/tv/order.js
// @require      lib/sites/tv/paint.js
// @require      lib/sites/investing.js
// @require      lib/sites/kite.js
// @require      lib/sites/hotkeys.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==
//UI Coordinates

// Reduce Version to 0.8 to force Update Script in Editor.
//-- Are we on the "interactive" page/site/domain or the "monitoring" one?
if (location.pathname.includes("alert-center")) {
    alertCenter();
} else if (location.host.includes("tradingview.com")) {
    tradingView();
} else if (location.pathname.includes("alerts-feed")) {
    alertFeed();
} else if (location.host.includes("kite.zerodha.com")) {
    kite();
}

//***************TRADING VIEW ********************

function tradingView() {
    SetupTvUI();
    loadTradingViewVars();

    document.addEventListener('keydown', doc_keyDown, false);

    //Register Ticker Change Listener
    //Using Seprate Selector as nameSelector has attribute changes in paint Name.
    waitEE(headerSelector, function (e) {
        attributeObserver(e, onTickerChange);
    });

    //Listen for Alert Clicks in AlertFeed
    GM_addValueChangeListener(
        alertClickedEvent, (keyName, oldValue, newValue,) => {
            HandleAlertClick(newValue);
        });

    //Listen for Input Value Changes
    $(`#${inputId}`).on('input', onInputChange);

    //Listen for Gtt Order Changes
    GM_addValueChangeListener(
        gttOrderEvent, (keyName, oldValue, newValue,) => {
            const gttOrderMap = GttOrderMap.loadFromGMValue(gttOrderEvent, newValue);
            gttSummary(gttOrderMap);
        });

    //Wait for Title to Load and Fix to Signal Auto Hotkey
    waitEE("title", (el) => {
        //console.log('Observing Title: ' + el.innerHTML);
        nodeObserver(el, EnableSwiftKey);
    });

    //Onload TV WatchList Paint
    waitJEE(`${watchListSelector} > div`, (el) => {
        //Ensure Repaint on scroll, add/remove to WatchList
        nodeObserver(el.get(0), onWatchListChange);

        //Ensure Repaint on Screener Changes
        message("Trying Screener Hook", "yellow");
        waitJEE(screenerSelector, (el) => {
            nodeObserver(el.get(0), onWatchListChange);

            message("Screener Hooked", "green");
        }, 10);

        //Paint WatchList, Screener etc
        onWatchListChange();

        // Load Alerts
        ForceRefreshAlerts();

        //Missing FNO's Logging        
        LogMissingData();
    }, 10);

    //Run Save Cron
    const seconds = 30
    setInterval(cronSave, seconds * 1000);
}
