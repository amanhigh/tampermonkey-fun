// ==UserScript==
// @name         FastAlert
// @namespace    aman
// @version      1.0
// @description  Fix Bad UI of Investing.com
// @author       Amanpreet Singh
// @match       https://in.tradingview.com/chart*
// @match       https://kite.zerodha.com*
// @match       https://in.investing.com/members-admin/alert-center*
// @match       https://in.investing.com/equities/*
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/client/kite.js
// @require      lib/client/investing.js
// @require      lib/sites/tv.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==
//UI Coordinates

const x = 100;
const y = 460;
const w = 20;
const xmssionKey = "fastAlert-event";
const tickerMapKey = "tickerMapKey";
const alertRequestKey = "alertRequest";
const alertResponseKey = "alertResponse";
const tokenKey = "token-key";
const gttKey = "gtt-event";
const style = "background-color: black; color: white;font-size: 15px"

//UI Elements
//TODO: Fix Elements
var symbol = document.createElement("input");
symbol.type = "text";
//symbol.value="PNB";
symbol.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 0)) + "px;right:" + y + "px;");

var prices = document.createElement("input");
prices.type = "text";
//prices.value="3-875.45 907.1 989.9";
prices.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 1)) + "px;right:" + y + "px;");
prices.onkeypress = function (e) {
    if (e.keyCode === 13) {
        setAlert();
    }
};

var fastGtt = document.createElement("input");
fastGtt.type = "button";
fastGtt.value = "GTT";
fastGtt.onclick = setGtt;
fastGtt.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 0)) + "px;right:" + (y + 200) + "px;");

var fastAlert = document.createElement("input");
fastAlert.type = "button";
fastAlert.value = "ALT";
fastAlert.onclick = setAlert;
fastAlert.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 1)) + "px;right:" + (y + 200) + "px;");

var useTicker = document.createElement("input");
useTicker.checked = true;
useTicker.setAttribute('type', 'checkbox');
useTicker.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 1)) + "px;right:" + (y + 250) + "px;");

var altz = document.createElement("div");
altz.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 3)) + "px;right:" + y + "px;");

//-- Are we on the "interactive" page/site/domain or the "monitoring" one?
if (location.pathname.includes("alert-center")) {
    alertCenter();
} else if (location.pathname.includes("equities")) {
    equities();
} else if (location.host.includes("tradingview.com")) {
    tradingView();
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

// FAST GTT
const margin = 0.005;

function createOrder(pair, ltp, sl, ent, tp, qty) {
    let d = new Date();
    let year = d.getFullYear() + 1;
    let month = d.getMonth();
    let day = d.getDate();
    let exp = `${year}-${month}-${day} 00:00:00`;
    createBuy(pair, ent, qty, ltp, exp);
    createOco(pair, sl, tp, qty, ltp, exp);

}

// Order Types
function createBuy(pair, price, qty, ltp, exp) {
    let buy_trg = generateTick(price + margin * price);
    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buy_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function createOco(pair, sl_trg, tp, qty, ltp, exp) {
    let sl = generateTick(sl_trg - margin * sl_trg);

    let tp_trg = generateTick(tp - margin * tp);
    let ltp_trg = generateTick(ltp + 0.03 * ltp);

    // Choose LTP Trigger If Price to close to TP.
    if (tp_trg < ltp_trg) {
        tp_trg = ltp_trg;
    }

    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${sl_trg},${tp_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${sl},"order_type":"LIMIT","product":"CNC"},{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${tp},"order_type":"LIMIT","product":"CNC"}]&type=two-leg&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function generateTick(n) {
    return (Math.ceil(n * 20) / 20).toFixed(2)
}

//************** ALERT CENTER*********************
function alertCenter() {
    //Listen for Alert Page Reloads
    GM_addValueChangeListener(
        xmssionKey, () => {
            reloadPage();
        });

    //Listen for Alert Requests
    GM_addValueChangeListener(alertRequestKey, (keyName, oldValue, newValue) => {
        getAlerts(newValue.id, GM_getValue(tokenKey), (alrts) => {
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

        //TODO: Remove , Since for Testing
        getAlerts(17984, GM_getValue(tokenKey), (alrts) => {
            console.log(getTriggers(alrts));
        })
    });
}

/**
 * Overrides SetRequestHeader to Capture 'Token' Header
 */
function captureToken() {
    XMLHttpRequest.prototype.realSetRequest = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
        if (k === 'token') {
            GM_setValue(tokenKey, v);
            console.log('Token Captured', k, v);
        }
        this.realSetRequest(k, v);
    };
}

//***************TRADING VIEW ********************

function tradingView() {
    setupFastAlertUI();

    document.addEventListener('keydown', doc_keyDown, false);

    //Register Ticker Change Listener
    waitEE(symbolSelector, function (e) {
        attributeObserver(e, onTickerChange);
    });

    //Register Alert Response Listener
    GM_addValueChangeListener(
        alertResponseKey, (keyName, oldValue, newValue) => {
            renderAlertSummary(newValue);
        });
}

function setupFastAlertUI() {
    document.body.appendChild(symbol);
    document.body.appendChild(prices);
    document.body.appendChild(fastAlert);
    document.body.appendChild(fastGtt);
    document.body.appendChild(useTicker);
    document.body.appendChild(altz);
}

// Alert Hotkeys
// TODO: Move to Hotkey Library
function doc_keyDown(e) {
    //console.log(e);
    //alert(`S Pressed: ${e.altKey} | ${e.ctrlKey} | ${e.shiftKey}`);

    if (isModifierKey(e.ctrlKey, 'm', e)) {
        // Auto Alert
        autoAlert();
    }
    if (isModifierKey(e.ctrlKey, ';', e)) {
        // Alert Reset
        resetAlerts();
    }
    if (isModifierKey(e.shiftKey, ';', e)) {
        // TODO: GTT Reset

    }
}

//Fast Alert: Set
function setAlert() {
    'use strict';

    let symb;

    //Read Symbol from Textbox or TradingView.
    if (symbol.value === "") {
        if (useTicker.checked) {
            //Use Ticker Symbol Original or Mapped
            symb = getMappedTicker();
        } else {
            //Use Stock Name
            symb = getName();
        }
    } else {
        //Use Input Box
        symb = symbol.value
        mapTicker(getTicker(), symb);
    }

    let input = prices.value;
    if (input) {
        //Split Alert Prices
        let split = input.trim().split(" ");

        //Search Symbol
        searchSymbol(symb, function (top) {
            message(top.name + ': ');

            //Set Alerts
            for (let p of split) {
                createAlert(top.pair_ID, p);
            }

            waitOn(xmssionKey, 10000, () => {
                //-- Send message to reload AlertList
                GM_setValue(xmssionKey, Date());

                symbol.value = "";
                prices.value = "";
            });
        });
    }
}

function autoAlert() {
    //Wait for Add Alert Context Menu Option
    waitJEE(".label-1If3beUH:contains(\'Add Alert\')", function (el) {
        let regExp = /\((.*)\)/g;
        let match = regExp.exec(el.text());
        var altPrice = parseFloat(match[1])

        searchSymbol(getMappedTicker(), function (top) {
            createAlert(top.pair_ID, altPrice);
            altRefresh();
        });
    });
}

function altRefresh() {
    waitOn(xmssionKey, 10000, () => {
        //-- Send message to reload AlertList
        GM_setValue(xmssionKey, Date());
        message('Refreshing Alerts'.fontcolor('skyblue'))
    });
}

//Fast Alert: Delete
function onAlertDelete(evt) {
    let $target = $(evt.currentTarget);
    let alt = $target.data('alt');
    deleteAlert(alt);
    altRefresh();
}

function resetAlerts() {
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {
        //Delete All Alerts
        deleteAllAlerts(top.pair_ID);

        altRefresh();
    });
}

function deleteAllAlerts(pairId) {
    deleteAlertLines();

    let triggers = GM_getValue(alertResponseKey);
    if (triggers) {
        //console.log(`Deleting all Alerts: ${pairId} -> ${triggers}`);
        for (let trg of triggers) {
            deleteAlert(trg);
        }
    }

    //Close Object Tree
    $('.tv-dialog__close').click();
}

function getTriggers(alrts) {
    return alrts.data.data.price.map(p => {
        return {id: p.alertId, price: parseFloat(p.conditionValue)};
    });

}

//Fast Alert: Summary
function onTickerChange() {
    //console.log('Ticker Changed');

    //Fetch Updates for this Ticker
    sendAlertRequest();

    //TODO: Hack to fix
    //Select Current Element to ensure WatchList Highlight remains on movement.
    $("div.active-3yXe9fgP").parent().parent().click()
}

function renderAlertSummary(alrts) {
    let ltp = readLtp();
    altz.innerHTML = ""; //Reset Old Alerts
    if (alrts) {
        alrts.sort(((a, b) => {
            return a.price > b.price
        })).forEach((alt) => {
            let priceString = alt.price.toString();
            //Alert Below Price -> Green, Above -> Red
            let coloredPrice = alt.price < ltp ? priceString.fontcolor('seagreen') : priceString.fontcolor('orangered');

            //Add Deletion Button
            let btn = $("<button>").html(coloredPrice).data('alt', alt)
                .css("background-color", "black").click(onAlertDelete);

            $(altz).append(btn);
        });
    } else {
        altz.innerHTML = "No AlertZ".fontcolor('red');
    }
}

//Fast Alert: GTT
function setGtt() {
    let symb;

    //Read Symbol from Textbox or TradingView.
    if (symbol.value === "") {
        symb = getTicker();
    } else {
        symb = symbol.value
    }

    let ltp = readLtp();
    let order;

    //Delete GTT on ".."
    if (prices.value === "..") {
        message(`GTT Delete: ${symb}`.fontcolor('red'));

        //Send Signal to Kite to place Order with Qty: -1
        GM_setValue(gttKey, {symb: symb, qty: -1});

        return;
    }

    if (prices.value === "") {
        //Read from Order Panel
        order = readOrderPanel();
        order.symb = symb;
        order.ltp = ltp;
        closeOrderPanel();

        //console.log(`GTT ${qty}- ${sl} - ${ent} - ${tp}`);
    } else {
        let order = {
            symb: symb,
            ltp: ltp,
        };
        //Order Format: QTY:3-SL:875.45 ENT:907.1 TP:989.9
        let qtyPrices = prices.value.trim().split("-");
        order.qty = parseFloat(qtyPrices[0]);
        let nextSplit = qtyPrices[1].split(" ");
        if (nextSplit.length === 3) {
            order.sl = parseFloat(nextSplit[0]);
            order.ent = parseFloat(nextSplit[1]);
            order.tp = parseFloat(nextSplit[2]);
        }
    }

    //Build Order and Display

    message(`${symb} (${order.ltp}) Qty: ${order.qty}, ${order.sl} - ${order.ent} - ${order.tp}`.fontcolor('yellow'));

    //If Valid Order Send else Alert
    if (order.qty > 0 && order.sl > 0 && order.ent > 0 && order.tp > 0) {
        //Send Signal to Kite to place Order.
        GM_setValue(gttKey, order);
    } else {
        alert("Invalid GTT Input");
    }
}

//Fast Alert: Helpers
function getMappedTicker() {
    let symb = getTicker();
    // Use Investing Ticker if available
    let investingTicker = resolveInvestingTicker(symb);
    if (investingTicker) {
        symb = investingTicker;
    }

    //console.log(symb,investingTicker);
    return symb;
}

function sendAlertRequest() {
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {
        GM_setValue(alertRequestKey, {id: top.pair_ID});
    });
}

function mapTicker(tvTicker, investingTicker) {
    let tickerMap = GM_getValue(tickerMapKey, {});
    tickerMap[tvTicker] = investingTicker;
    GM_setValue(tickerMapKey, tickerMap);

    console.log(`Mapped Ticker: ${tvTicker} to ${investingTicker}`);
}

function resolveInvestingTicker(tvTicker) {
    let tickerMap = GM_getValue(tickerMapKey, {});
    return tickerMap[tvTicker];
}