//Selectors
const symbolSelector = 'div.title-bcHj6pEn';
const exchangeSelector = '.select-1T7DaJS6';

const screenerSymbolSelector = '.tv-screener__symbol';
const watchListSymbolSelector = '.symbolNameText-2EYOR9jS';
const watchListNameSelector = 'div.symbol-17NLytxZ';

const tickerSelector = '.input-3lfOzLDc';
const nameSelector = ".dl-header-symbol-desc";
const ltpSelector = '.dl-header-price';

const watchListSelector = ".tree-T6PqyYoA";
const screenerSelector = ".tv-data-table";

//Stores
const orderInfoStore = 'orderInfo';
const styleIndexStore = 'styleIndex';
const tickerMapStore = "tickerMap";

//Cross Requests
const alertRequestKey = "alertRequest";
const alertResponseKey = "alertResponse";
const gttRequest = "gttRequest";
const syncOrderRequest = "syncOrderRequest";

//UI Ids
const swiftId = 'aman-swift';
const summaryId = 'aman-summary';
const symbolId = 'aman-symbol';
const priceId = 'aman-price';
const gttId = 'aman-gtt';
const altzId = 'aman-altz';
const ordersId = 'aman-orders';

//Constants
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'greenyellow', 'brown'];
const indexSymbols = ['CNXMIDCAP', 'CNXSMALLCAP', 'IXIC', 'DXY', 'NIFTY', 'NIFTYJR', 'US10Y', 'USOIL', 'USDINR', 'XAUUSD', 'XAGUSD', 'SHCOMP', 'BTCUSD', 'GOLDSILVER'];
const nameLength = 10;

// -- Info Readers
function getName() {
    return $(nameSelector)[0].innerHTML;

}

function getTicker() {
    return $(tickerSelector).val();
}

function readLtp() {
    return parseFloat($(ltpSelector).text());
}

// WatchList
function getWatchListTickers() {
    return $(watchListSymbolSelector).toArray().map(s => s.innerHTML);
}

function getWatchListNames() {
    return $(watchListNameSelector).map((i, e) => e.title.split(',')[0].toLowerCase().substring(0, nameLength)).toArray();
}

// OrderPanel
function readOrderPanel() {
    let qty = parseFloat($('.units-3uGpy-z- input').val());
    let sl = parseFloat($('.group-2UNHLSVG input:nth(4)').val());
    let ent = parseFloat($('.group-2UNHLSVG input:nth(0)').val());
    let tp = parseFloat($('.group-2UNHLSVG input:nth(2)').val());
    return {qty, sl, ent, tp};
}

function closeOrderPanel() {
    //Close Order Panel
    $('.close-2XGlFxM0').click();
}

// -- TV Actions
/**
 * Switch TradingView Exchange
 */
function toggleExchange() {
    let exch = $(exchangeSelector).text();
    //Open Toggle Menu
    $(exchangeSelector).click();

    if (exch == "NSE") {
        //Select All Exchanges
        $('.allExchanges-29JoOLdp').click();
    } else {
        //Select NSE
        $('.exchange-3hAo4mow:nth(72)').click();
    }
}

/**
 * Handles Opening TextBox and Disabling SwiftKeys
 */
function textBox() {
    //Disable SwiftKeys
    toggleSwiftKeys(false);

    //Select Day Style
    waitClick('div.container-AqxbM340:nth-child(1)'); // Click Style
    waitClick('.menuBox-20sJGjtG > div:nth-child(4) > div:nth-child(1)'); // Select Day

    //Select Text Area
    waitEE('.textarea-bk9MQutx', (e) => e.focus());
}

/**
 * Opens Given Ticker in Trading View.
 * @param ticker
 */
function openTicker(ticker) {
    waitInput('input', ticker);
    waitClick("td.symbol-edit-popup-td");
}

/**
 *  Remove from Watch List Last Selected Symbol
 */
function removeFromWatchList() {
    let removeNode = $('div[data-active=true]').parent().prev()
    let removeTicker = removeNode.children('div').attr('data-symbol-short')

    message(`WDel: ${removeTicker}`.fontcolor('red'), 5000)

    //Remove Previous Symbol. Incase of Last Symbol Prev is Nil
    removeNode.find('.removeButton-2DU0hPm3').click()
}

/**
 * Title Change to Bridge witH AHK
 */
function fixTitle() {
    let liner = ' - SwiftKeys';
    //console.log('Processing Title: ' + document.title);
    //SwiftKey On and No Title Add It.
    let swiftEnabled = $(`#${swiftId}`).prop('checked');
    if (swiftEnabled && !document.title.includes('SwiftKeys')) {
        document.title = document.title + liner;
    } else if (!swiftEnabled && document.title.includes('SwiftKeys')) {
        // SwiftKey Off and Title present, Remove It.
        document.title = document.title.replace(liner, '');
    }
}

/**
 * Delete all Alert lines by opening Object Tree
 */
function deleteAlertLines() {
    $('#drawing-toolbar-object-tree').click();
    waitEE('.tv-objects-tree-item__title', function () {
        $('.tv-objects-tree-item__title:contains("Horizontal Line")').parent().find('.js-remove-btn').click();
    });
}

// -- Feature Sets

// Painters
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
    $(watchListSymbolSelector).css('color', 'white');
    //Paint Index
    paint(watchListSymbolSelector, indexSymbols, colorList[6]);
    //Paint Kite
    paintTickers(watchListSymbolSelector);
    watchSummary();

    //To be Used on Alert Feed; Delay Required as during paint it has nse:symbol but we require name.
    setTimeout(() => GM_setValue(tvWatchChangeEvent, getWatchListNames()), 1000);
    //console.log("Painting WatchList");
}

/**
 * Paints TV Screener Elements.
 */
function paintTVScreener() {
    //Must Run in this Order- Clear, WatchList, Kite
    $(screenerSymbolSelector).css('color', 'white');

    paint(screenerSymbolSelector, getWatchListTickers(), colorList[5]);
    paintTickers(screenerSymbolSelector);
    //console.log("Painting Screener");
}

/**
 * Paints Ticker Name in Detail Section
 */
function paintDetails() {
    /* Read Current Symbol Href Link Containing Symbol */
    let ref = $(".dl-header > div:nth-child(1) > a:nth-child(2)").attr('href')
    if (ref) {
        /* Extract Symbol from Href */
        let symbol = ref.split("-")[1].replace('/', '');

        let $name = $(nameSelector);
        //Check if href contains symbol then paint stock name
        if (getWatchListTickers().includes(symbol)) {
            $name.css('color', colorList[5]);
        } else {
            $name.css('color', 'white');
        }

        //console.log("Painting Details");
    }
}

// PaintHelpers
function paintTickers(selector) {
    let orders = GM_getValue(orderInfoStore, getDefaultOrders());

    for (let i = 0; i < 5; i++) {
        paint(selector, orders[i] || [], colorList[i]);
    }
}

function paint(selector, symbols, colour) {
    for (const sym of symbols) {
        $(`${selector}:contains("${sym}")`).css('color', colour);
    }
}

// Order Handling
/**
 * Records order for given ListNo.
 * @param listNo
 */
function recordOrder(listNo) {
    let ticker = getTicker();

    /* Store Order Info */
    let orders = GM_getValue(orderInfoStore, getDefaultOrders())
    //Create Set if first time, Convert Json array to Set as Json can't store sets.
    let orderSet = new Set(orders[listNo]);
    let readySet = new Set(orders[2]);
    //Use Set to maintain uniqueness
    if (orderSet.has(ticker)) {
        orderSet.delete(ticker);
        message(`Ticker UnWatched: ${ticker}`.fontcolor(colorList[listNo]))
    } else {
        orderSet.add(ticker);
        message(`Ticker Watched: ${ticker}`.fontcolor(colorList[listNo]))

        //Remove Order from Ready Set if added to Short/Long Orders
        if (listNo < 2 && readySet.has(ticker)) {
            readySet.delete(ticker);
            orders[2] = Array.from(readySet);
            message(`Ready Order Cleared: ${ticker}`.fontcolor(colorList[2]))
        }
    }
    //Convert to array before Storing.
    orders[listNo] = Array.from(orderSet);
    // console.log(orders);
    GM_setValue(orderInfoStore, orders)

    //Update TV WatchList
    paintTVWatchList();
}

function getDefaultOrders() {
    let m = {};
    for (let i = 0; i < 5; i++) {
        m[i] = [];
    }
    return m;
}

function watchSummary() {
    let msg = ""
    let orders = GM_getValue(orderInfoStore, getDefaultOrders());

    for (let i = 0; i < 5; i++) {
        msg += orders[i].length.toString().fontcolor(colorList[i]) + '|';
    }

    //Count Indices
    var watchTickers = getWatchListTickers();
    var indexCount = 0;
    //TODO: Simplify to one liner
    for (const ticker of watchTickers) {
        if (indexSymbols.includes(ticker)) {
            indexCount++;
        }
    }

    // Total Count without Index
    msg += (watchTickers.length - indexCount).toString().fontcolor(colorList[5]);

    //Add Index Count @ End
    msg += '|' + indexCount.toString().fontcolor(colorList[6]);

    $(`#${summaryId}`).html(msg);
    //console.log(msg);
}

function syncOrders() {
    let orders = GM_getValue(orderInfoStore, getDefaultOrders());
    // console.log('Sending Sync Order Request: ',orders)
    GM_setValue(syncOrderRequest, orders);

    message('Syncing Orders'.fontcolor('yellow'))
}

//Fast GTT
function setGtt() {
    let symb;

    //Read Symbol from Textbox or TradingView.
    let currentSymbol = $(`#${symbolId}`).val();
    if (currentSymbol === "") {
        symb = getTicker();
    } else {
        symb = currentSymbol;
    }

    let ltp = readLtp();
    let order;

    let prices = $(`#${priceId}`).val();
    if (prices === "") {
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
        let qtyPrices = prices.trim().split("-");
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
        GM_setValue(gttRequest, order);
    } else {
        alert("Invalid GTT Input");
    }
}

function onDeleteGtt(evt) {
    let $target = $(evt.currentTarget);
    let id = $target.data('order-id');

    message(`GTT Delete: ${id}`.fontcolor('red'));

    //Send Signal to Kite delete  Order with only id
    GM_setValue(gttRequest, {id: id});
}

//Fast Alert: Set
function onPriceKeyPress(e) {
    if (e.keyCode === 13) {
        setAlert();
    }
}

function setAlert() {
    'use strict';

    let symb;

    //Read Symbol from Textbox or TradingView.
    let currentSymbol = $(`#${symbolId}`).val();
    if (currentSymbol === "") {
        //Use Ticker Symbol Original or Mapped
        symb = getMappedTicker();
    } else {
        //Use Input Box
        symb = currentSymbol;
        mapTicker(getTicker(), symb);
    }

    let input = $(`#${priceId}`).val();
    if (input) {
        //Split Alert Prices
        let split = input.trim().split(" ");

        //Search Symbol
        searchSymbol(symb, function (top) {
            message(top.name + ': ');

            //Set Alerts
            for (let p of split) {
                createAlert(top.pairId, p);
            }

            //Clear Values
            setTimeout(() => {
                $(`#${symbolId}`).val("");
                $(`#${priceId}`).val("");
            }, 10000);

            //Alert Refresh
            altRefresh();
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
            createAlert(top.pairId, altPrice);
            altRefresh();
        });
    });
}

function altRefresh() {
    waitOn(reloadEvent, 1500, () => {
        //Refresh Investing Page
        //-- Send message to reload AlertList
        // GM_setValue(xmssionKey, Date());

        //Locally Refresh Alerts
        sendAlertRequest();
    });
}

//Fast Alert: Delete
function onAlertDelete(evt) {
    let $target = $(evt.currentTarget);
    let alt = $target.data('alt');
    deleteAlert(alt);
    altRefresh();
}

function resetAlerts(deleteLines = false) {
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {

        //Delete All Alerts
        deleteAllAlerts(top.pairId);

        if (deleteLines) {
            deleteAlertLines();
        }

        altRefresh();
    });
}

function deleteAllAlerts(pairId) {
    let alertData = GM_getValue(alertResponseKey);
    let triggers = alertData.triggers;

    if (triggers) {
        //console.log(`Deleting all Alerts: ${pairId} -> ${triggers}`);
        for (let trg of triggers) {
            deleteAlert(trg);
        }
    }

    //Close Object Tree
    $('.tv-dialog__close').click();
}

/**
 * Filters Price Alerts and maps to price,id
 * @param alrts Alerts Response
 * @returns {{name: any, triggers: (number|{price: number, id: any}[])}}
 */
function getTriggers(alrts) {
    let triggers = alrts.data.data.price && alrts.data.data.price.filter(p => p.alert_trigger === "price").map(p => {
        return {id: p.alertId, price: parseFloat(p.conditionValue)};
    });
    return {name: alrts.data.data.pairData.name, triggers: triggers};

}

//Fast Alert: Summary
function onTickerChange() {
    //console.log('Ticker Changed');

    refreshSummary();

    //TODO: Hack to fix
    //Select Current Element to ensure WatchList Highlight remains on movement.
    $("div.active-3yXe9fgP").parent().parent().click()
}

function sendAlertRequest() {
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {
        GM_setValue(alertRequestKey, {id: top.pairId, date: new Date()});
    });
}

function refreshSummary() {
    //Fetch Alerts
    sendAlertRequest();

    //Fetch Orders
    gttSummary(GM_getValue(gttMapStore, {}));
}

function alertSummary(alertData) {
    let alrts = alertData.triggers;
    let ltp = readLtp();
    let $altz = $(`#${altzId}`);
    $altz.empty(); //Reset Old Alerts

    // Add Alert Buttons
    // message(`ARefresh: ${alertData.name}`.fontcolor('skyblue'))
    if (alrts) {
        alrts.sort(((a, b) => {
            return a.price > b.price
        })).forEach((alt) => {
            let priceString = alt.price.toString();
            //Alert Below Price -> Green, Above -> Red
            let coloredPrice = alt.price < ltp ? priceString.fontcolor('seagreen') : priceString.fontcolor('orangered');

            //Add Deletion Button
            buildButton("", coloredPrice, onAlertDelete).data('alt', alt).appendTo($altz);
        });
    } else {
        buildLabel("No AlertZ".fontcolor('red')).appendTo($altz);
    }

    buildButton("aman-refresh-alt", "R", refreshSummary).css("background-color", "black").appendTo($altz);
}

function gttSummary(m) {
    let orders = m[getTicker()];
    let $orders = $(`#${ordersId}`);
    //Clear Old Orders
    $orders.empty();

    //If Orders Found for this Ticker
    if (orders) {
        //Add GTT Buttons
        orders.forEach((order) => {
            let shortType = order.type.includes('BUY') ? "B" : "SL";
            buildButton("", `${shortType}-${order.qty}`.fontcolor('yellow'), onDeleteGtt).data('order-id', order.id).appendTo($orders);
        })
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


function mapTicker(tvTicker, investingTicker) {
    let tickerMap = GM_getValue(tickerMapStore, {});
    tickerMap[tvTicker] = investingTicker;
    GM_setValue(tickerMapStore, tickerMap);

    console.log(`Mapped Ticker: ${tvTicker} to ${investingTicker}`);
}

function resolveInvestingTicker(tvTicker) {
    let tickerMap = GM_getValue(tickerMapStore, {});
    return tickerMap[tvTicker];
}

//Hotkeys: TradingView Toolbar & Style
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 * @param name: MN/WK/DL/HL (Unused)
 * @param styleIndex: Style Index Based on Dropdown List in Styles
 */
function timeframe(timeFrameIndex, name, styleIndex) {
    $(`#header-toolbar-intervals > div:nth-child(${timeFrameIndex})`).click();
    GM_setValue(styleIndexStore, styleIndex);
}

/**
 * Based on Provided Positions Select Appropriate Style
 * @param positions
 */
function timeframeStyle(positions) {
    let tindex = GM_getValue(styleIndexStore);
    style(positions[tindex]);
}

/**
 * Clicks Favourite Toolbar on Given Index
 * @param index
 */
function toolbar(index) {
    $(`div.ui-sortable:nth-child(2) > div:nth-child(${index}) > span:nth-child(1)`).click();
}

/**
 * Clicks Appropriate Index in Dropdown.
 * @param index
 */
function style(index) {
    // Template Selector
    waitClick('a.tv-linetool-properties-toolbar__button')

    //Clicks Style based on Index.
    waitClick(`a.item:nth-child(${index})`)
}

// -- UI Setup
function setupFastAlertUI() {
    buildArea(areaId, '76%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildCheckBox(swiftId, false).change(fixTitle))
        .append(buildLabel("", summaryId))
        .append(buildButton(gttId, 'GTT', setGtt));

    buildWrapper('aman-mid').appendTo(`#${areaId}`)
        .append(buildInput(symbolId))
        .append(buildInput(priceId).keypress(onPriceKeyPress));

    buildWrapper(altzId).appendTo(`#${areaId}`);
    buildWrapper(ordersId).appendTo(`#${areaId}`);
}