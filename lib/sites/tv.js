//Selectors
const symbolSelector = 'div.title-bcHj6pEn';
const exchangeSelector = '.select-1T7DaJS6';

const screenerSymbolSelector = '.tv-screener__symbol';
const watchListSymbolSelector = '.symbolNameText-2EYOR9jS';
const watchListNameSelector = 'div.symbol-17NLytxZ';

const tickerSelector = '.input-3lfOzLDc';
const nameSelector = ".dl-header-symbol-desc";
const ltpSelector = '.dl-header-price';

const watchListSelector = ".listContainer-1OhjZIMS div";
const screenerSelector = ".tv-data-table";

//Stores
const orderInfoStore = 'orderInfo';
const styleIndexStore = 'styleIndex';
const tickerMapStore = "tickerMap";

//Inmemory Stores
var nameTickerMapMem;

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
const refreshId = 'aman-refresh';
const altzId = 'aman-altz';
const ordersId = 'aman-orders';

//Constants
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'greenyellow', 'brown', 'darkkhaki'];
const indexSymbols = ['CNXMIDCAP', 'CNXSMALLCAP', 'IXIC', 'DXY', 'NIFTY', 'NIFTYJR', 'US10Y', 'IN10Y', 'USOIL', 'USDINR', 'XAUUSD', 'XAGUSD', 'SHCOMP', 'BTCUSD', 'GOLDSILVER'];
const nameLength = 20

// -- Info Readers
function getName() {
    return $(nameSelector)[0].innerHTML;

}

function getTicker() {
    return $(tickerSelector).val();
}

function getExchange() {
 return $('.title3rd-2bpagZ7H').text();
}

function readLtp() {
    return parseFloat($(ltpSelector).text());
}

// WatchList
function getWatchListTickers(includeComposite = true) {
    //Exclude Composite Tickers
    return $(watchListSymbolSelector).toArray().map(s => s.innerHTML).filter(s => !(isCompositeTicker(s) && !includeComposite));
}

function getCompositeTickers() {
    return getWatchListTickers().filter(s => isCompositeTicker(s))
}

/**
 * Gives Watch List Names of Investing.com
 * @returns {T[] | jQuery}
 */
function getWatchListNames() {
    let m = GM_getValue(pairMapStore, {}) //Load Pair Map
    //Map Name or Ticker itself if not found
    return getWatchListTickers(false).map((t) => {
        let info = m[resolveTicker(t)];
        return info ? trimInvestingName(info.name) : t;
    });
}

function isCompositeTicker(ticker) {
    return ticker && (ticker.includes("/") || ticker.includes("*"));
}

function toggleSymbols(color, index) {
    // console.log('Toggling Symbols', color, index);
    let colorSelector = `span.symbolNameText-2EYOR9jS[style*='color: ${color}']`
    // let hiddenSelector = colorSelector + ":hidden";
    let lineSelector = `div.wrap-ZwpHWy6f`;
    let hasSelector = `${lineSelector}:has(${colorSelector})`;
    let notSelector = `${lineSelector}:not(:has(${colorSelector}))`;

    switch (index) {
        case 1:
            //Left Mouse: Show Only This Color
            $(lineSelector).show();
            $(notSelector).hide();
            break;
        case 2:
            //Middle Mouse: Hide Only This Color
            $(hasSelector).hide();
            break;
        case 3:
            //Right Mouse: Hide Only This color
            $(lineSelector).show();
            break;
        default:
            message('You have a strange Mouse!'.fontcolor('red'));
    }
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
        $('.exchange-3hAo4mow:nth(73)').click();
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
    $(watchListSymbolSelector).css('color', colorList[5]);
    //Paint Index
    paint(watchListSymbolSelector, indexSymbols, colorList[7]);
    //Paint Composite Symbols
    paint(watchListSymbolSelector, getCompositeTickers(), colorList[8]);
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
    $(screenerSymbolSelector).css('color', colorList[5]);

    //Highlight WatchList
    paint(screenerSymbolSelector, getWatchListTickers(false), colorList[6]);
    //Paint Selected Tickers
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
        let split = ref.split("-");
        if (split.length > 1) {
            let symbol = split[1].replace('/', '');

            let $name = $(nameSelector);
            //Check if href contains symbol then paint stock name
            if (getWatchListTickers().includes(symbol)) {
                //Highlight
                $name.css('color', colorList[6]);
            } else {
                //Normal
                $name.css('color', colorList[5]);
            }

            //console.log("Painting Details");
        }
    }
}

// PaintHelpers
function paintTickers(selector) {
    let orders = OrderSet.getOrders();

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
 * Manages Orders
 */
class OrderSet {
    orders;
    readyList = 2;
    maxList = 5;
    runningList = 4;

    constructor() {
        //Load Orders from GM Store
        //TODO: Move Default Orders In
        this.orders = OrderSet.getOrders();
    }

    static getOrders() {
        let m = GM_getValue(orderInfoStore, {});
        //Default Orders if Not Present
        if (Object.keys(m) < 4) {
            for (let i = 0; i < this.maxList; i++) {
                m[i] = [];
            }
        }
        return m;
    }

    has(listNo, ticker) {
        //Convert Json array to Set as Json can't store sets.
        return this.getSet(listNo).has(ticker);
    }

    toggle(listNo, ticker) {
        if (this.has(listNo, ticker)) {
            this.delete(listNo, ticker);
        } else {
            this.add(listNo, ticker);
        }
    }

    add(listNo, ticker) {
        this.orders[listNo].push(ticker);
        message(`Ticker Watched: ${ticker}`.fontcolor(colorList[listNo]));

        //Post Process
        this.postAdd(listNo, ticker);
    }

    postAdd(listNo, ticker) {
        //Remove Order from Ready Set if added to Short/Long Orders
        if (listNo < this.readyList && this.has(this.readyList, ticker)) {
            this.delete(this.readyList, ticker);
        } else if (listNo === this.runningList) {
            //If Order is made Running remove from Wait Lists
            for (let i = 0; i < this.readyList; i++) {
                if (this.has(i, ticker)) {
                    this.delete(i, ticker);
                }
            }
        }
    }

    clean() {
        let watchListTickers = getWatchListTickers();
        for (let i = 0; i < this.maxList; i++) {
            for (let ticker of this.orders[i]) {
                //Remove All Tickers Not in WatchList
                if (!watchListTickers.includes(ticker)) {
                    this.delete(i, ticker)
                }
            }
        }
        this.save();
    }

    delete(listNo, ticker) {
        let newSet = this.getSet(listNo)
        newSet.delete(ticker);
        this.setSet(listNo, newSet);
        message(`Ticker UnWatched: ${ticker}`.fontcolor(colorList[listNo]))
    }

    setSet(listNo, set) {
        this.orders[listNo] = Array.from(set);
    }

    getSet(listNo) {
        return new Set(this.orders[listNo]);
    }

    save() {
        // console.log("Saving OrderSet", this.orders)
        GM_setValue(orderInfoStore, this.orders)
    }
}

/**
 * Records order for given ListNo.
 * @param listNo
 */
function recordOrder(listNo) {
    let ticker = getTicker();

    /* Store Order Info */
    let orderSet = new OrderSet();
    //Use Set to maintain uniqueness
    orderSet.toggle(listNo, ticker);

    orderSet.save();

    //Update TV WatchList
    paintTVWatchList();
}

function watchSummary() {

    /**
     * Adds Count to Watch Summary
     * @param indexCount
     * @param colorIndex
     */
    $watchSummary = $(`#${summaryId}`);
    $watchSummary.empty();

    function addCount(indexCount, colorIndex) {
        buildLabel(indexCount.toString() + '|', colorList[colorIndex]).data('color', colorList[colorIndex]).appendTo($watchSummary)
            .mousedown((e) => {
                toggleSymbols($(e.target).data('color'), e.which);
            }).contextmenu(e => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    let orders = OrderSet.getOrders();
    for (let i = 0; i < 5; i++) {
        addCount(orders[i].length, i);
    }

    //Count Indices
    var watchTickers = getWatchListTickers();
    var indexCount = watchTickers.filter(t => indexSymbols.includes(t)).length;
    var compositeCount = getCompositeTickers().length;

    // Total Count without Index
    addCount((watchTickers.length - indexCount - compositeCount), 5);

    //Add Index,Composite Count
    addCount(indexCount, 7);
    addCount(compositeCount, 8);
}

function syncOrders() {
    let orders = OrderSet.getOrders();
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

    //Fetch Alerts
    sendAlertRequest();

    //Fetch Orders
    gttSummary(GM_getValue(gttMapStore, {}));

    //TODO: Hack to fix
    //Select Current Element to ensure WatchList Highlight remains on movement.
    $("div.active-3yXe9fgP").parent().parent().click()
}

function sendAlertRequest() {
    //Search Symbol
    let symb = getMappedTicker();

    if (!isCompositeTicker(symb)) {
        //Skip Composite Symbols
        searchSymbol(symb, function (top) {
            GM_setValue(alertRequestKey, {id: top.pairId, date: new Date()});
        });
    } else {
        //Clear Old Alerts
        $(`#${altzId}`).empty()
    }
}

function onReferesh() {
    //Refresh Ticker
    onTickerChange();

    //Reconstruct Name Map on Refresh
    buildNameMap(true);

    //Clean Order Set
    new OrderSet().clean();
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
        buildLabel("No AlertZ", 'red').appendTo($altz);
    }
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
    return resolveTicker(getTicker());
}

function resolveTicker(tvTicker) {
    let tickerMap = GM_getValue(tickerMapStore, {});

    // Use Investing Ticker if available
    let investingTicker = tickerMap[tvTicker];
    if (investingTicker) {
        tvTicker = investingTicker;
    }

    //console.log(tvTicker,investingTicker);
    return tvTicker;
}

function mapTicker(tvTicker, investingTicker) {
    let tickerMap = GM_getValue(tickerMapStore, {});
    tickerMap[tvTicker] = investingTicker;
    GM_setValue(tickerMapStore, tickerMap);

    console.log(`Mapped Ticker: ${tvTicker} to ${investingTicker}`);
}

function buildNameMap(force = false) {
    //If Name Map doesn't exist or if forced rebuild
    if (!nameTickerMapMem || force) {
        nameTickerMapMem = {}; //Reset Name Map
        let m = GM_getValue(pairMapStore, {}) //Load Pair Map
        //Load Ticker Map
        let investingToTVTickerMap = reverseMap(GM_getValue(tickerMapStore, {}))

        //Map Name to Ticker
        Object.keys(m).forEach((investingTicker) => {
            let name = trimInvestingName(m[investingTicker].name);
            //Map to TV Ticker if Present
            let tvTicker = investingToTVTickerMap[investingTicker];
            nameTickerMapMem[name] = tvTicker ? tvTicker : investingTicker;
            // console.log(m[investingTicker]);
        })

    }
    return nameTickerMapMem;
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
    buildArea(areaId, '76%', '6%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildCheckBox(swiftId, false).change(fixTitle))
        .append(buildButton(gttId, 'G', setGtt))
        .append(buildButton(refreshId, 'R', onReferesh))
        .append(buildWrapper(summaryId));

    buildWrapper('aman-mid').appendTo(`#${areaId}`)
        .append(buildInput(symbolId))
        .append(buildInput(priceId).keypress(onPriceKeyPress));

    buildWrapper(altzId).appendTo(`#${areaId}`);
    buildWrapper(ordersId).appendTo(`#${areaId}`);
}