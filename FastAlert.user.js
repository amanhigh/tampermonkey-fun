// ==UserScript==
// @name         FastAlert
// @namespace    aman
// @version      1.0
// @description  Fix Bad UI of Investing.com
// @author       Amanpreet Singh
// @match       https://in.tradingview.com/chart*
// @match       https://kite.zerodha.com/*
// @match       https://in.investing.com/*
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/ui.js
// @require      lib/client/kite.js
// @require      lib/client/investing.js
// @require      lib/sites/tv.js
// @require      lib/sites/investing.js
// @require      lib/sites/kite.js
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
}

//*************** KITE *********************
function kite() {
    //Listen for GTT Orders
    GM_addValueChangeListener(
        gttKey, (keyName, oldValue, newValue) => {
            //console.log (`Received new GTT Order: ${newValue}`);
            if (newValue.qty > 0) {
                createOrder(newValue.symb, newValue.ltp, newValue.sl, newValue.ent, newValue.tp, newValue.qty)
            } else {
                //Qty: -1 Signal for Delete GTT
                deleteGTT(newValue.symb);
            }
        });
}

//************** Investing *********************
function alertCenter() {
    //Listen for Alert Page Reloads
    GM_addValueChangeListener(
        xmssionKey, () => {
            reloadPage();
        });

    //Listen for Request to Get Alert Details
    GM_addValueChangeListener(alertRequestKey, (keyName, oldValue, newValue) => {
        // console.log('Alert request', newValue);
        getAlerts(newValue.id, GM_getValue(tokenKey), (alrts) => {
            // console.log('Alert Fetched', alrts);
            GM_setValue(alertResponseKey, getTriggers(alrts));
        })
    });

    //Add Auto Delete Confirmation Handler on all Delete Buttons
    $('.js-delete-btn').click(function () {
        waitClick('.js-delete');
    });

    //console.log("Reload Listner Added")
}

function equities() {
    //Wait For Alert Bell
    waitEE('.add-alert-bell', () => {
        captureToken();

        // getAlerts(17984, GM_getValue(tokenKey), (alrts) => {
        //     console.log(getTriggers(alrts));
        // })
    });
}

//***************TRADING VIEW ********************

function tradingView() {
    setupFastAlertUI();

    document.addEventListener('keydown', doc_keyDown, false);

    //Register Ticker Change Listener
    waitEE(symbolSelector, function (e) {
        attributeObserver(e, onTickerChange);
    });

    //Register Alert Response Listener (After Alert Details Fetched)
    GM_addValueChangeListener(
        alertResponseKey, (keyName, oldValue, newValue) => {
            renderAlertSummary(newValue);
        });

    //Listen for Alert Clicks in AlertFeed
    GM_addValueChangeListener(
        alertClickedKey, (keyName, oldValue, newValue,) => {
            //Required for proper alert Opening
            openTicker('DHFL'); // DO NOT REMOVE DHFL Line
            openTicker(newValue);
        });

    //Wait for Title to Load and Fix to Signal Auto Hotkey
    waitEE("title", (el) => {
        //console.log('Observing Title: ' + el.innerHTML);
        nodeObserver(el, fixTitle);
    });

    //Onload TV WatchList Paint
    waitEE(watchListSelector, (el) => {

        // Paint WatchList Once Loaded
        paintTVWatchList();

        // Load Alerts
        sendAlertRequest()

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
}

