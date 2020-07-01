//Selectors
const tickerSelector = '.input-3lfOzLDc';
const exchangeSelector = '.title3rd-2bpagZ7H';
const exchangeSwitchSelector = '.select-1T7DaJS6';

const nameSelector = 'div.title-bcHj6pEn:first';
const ltpSelector = '.dl-header-price';

const flagSelector = "div.uiMarker-2qpL8Ijj";
const saveSelector = '#header-toolbar-save-load';

const screenerSelector = "tbody.tv-data-table__tbody:nth(1)";
const screenerLineSelector = `tr.tv-screener-table__result-row`;
const screenerSymbolSelector = '.tv-screener__symbol';

const watchListSelector = `.listContainer-1OhjZIMS`;
const watchListLineSelector = `${watchListSelector} > div > div`;
const watchListSymbolSelector = 'span.symbolNameText-2EYOR9jS';

//Stores
const orderInfoStore = 'orderInfo';
const flagInfoStore = 'flagInfo';
const styleIndexStore = 'styleIndex';
const tickerMapStore = "tickerMap";

//Inmemory Stores
var nameTickerMapMem;
var scalpModeOn;
var filterChain = [];
var recentTickers = new Set();

var orderSet;
var flagSet;

//Cross Requests
const alertRequestKey = "alertRequest";
const alertResponseKey = "alertResponse";
const gttRequest = "gttRequest";

//UI Ids
const swiftId = 'aman-swift';
const summaryId = 'aman-summary';
const symbolId = 'aman-symbol';
const priceId = 'aman-price';
const gttId = 'aman-gtt';
const refreshId = 'aman-refresh';
const recentId = 'aman-recent';
const altzId = 'aman-altz';
const ordersId = 'aman-orders';

//Constants
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'];
const fnoCss = {
    'border-top-style': 'groove',
    'border-width': 'medium'
};

// Constants VHTF,HTF,ITF,TTF
const lineMenu = [6, 3, 4, 5];
const demandMenu = [10, 4, 6, 8];
const supplyMenu = [11, 5, 7, 9];
const timeFrameBar = [7, 6, 5, 3]

function loadTradingViewVars() {
    orderSet = new OrderSet();
    flagSet = new FlagSet();
    nameTickerMapMem = buildNameMap();
}

// -- Info Readers
function getName() {
    return $(nameSelector)[0].innerHTML;

}

function getTicker() {
    return $(tickerSelector).val();
}

function getExchange() {
    return $(exchangeSelector).text();
}

function readLtp() {
    return parseFloat($(ltpSelector).text());
}

// -- Info Processors
function logMissingFno() {
    let missingFnos = [...fnoSymbols].filter((sym) => {
        for (let i of [0, 1, 4, 6]) {
            if (flagSet.get(i).has(sym)) {
                //Symbol Found so Not Missing
                return false;
            }
        }
        //Symbol Not Found So Missing
        return true;
    });
    message(`FNOS --> Total: ${fnoSymbols.size}, Missing: ${missingFnos.length}`)
    console.log('Missing FNOs', missingFnos);
}

// WatchList
function getWatchListTickers(includeComposite = true) {
    //Exclude Composite Tickers
    return $(watchListSymbolSelector).toArray().map(s => s.innerHTML).filter(s => !(isCompositeTicker(s) && !includeComposite));
}

/**
 *  Saves Watch List and Composite Tickers
 *  to Order Set.
 */
function saveWatchListTickers() {
    //Parse Watch List
    let watchListTickers = getWatchListTickers();

    //Set Composite Symbols
    orderSet.set(7, new Set(watchListTickers.filter(s => isCompositeTicker(s))));

    //Prep Watchlist Set with all Symbols not in other Order Sets
    let watchSet = new Set(watchListTickers);
    for (let i = 0; i < colorList.length; i++) {
        if (i !== 5) {
            orderSet.get(i).forEach(v => watchSet.delete(v));
        }
    }
    orderSet.set(5, watchSet);

    //Save Order Set
    orderSet.save();
}

function getWatchListSelected() {
    return $(`.selected-1d4hA4fK ${watchListSymbolSelector}:visible`).toArray().map(s => s.innerHTML);
}

function isCompositeTicker(ticker) {
    return ticker && (ticker.includes("/") || ticker.includes("*"));
}

// Screener
function getScreenerSelected() {
    return $(`.tv-screener-table__result-row--selected ${screenerSymbolSelector}:visible`).toArray().map(s => s.innerHTML);
}

function getSelection() {
    //Get Selected Items
    let selected = getWatchListSelected().concat(getScreenerSelected());

    //Use Active Ticker on No Selection
    if (selected.length === 0) {
        selected.push(getTicker());
    }
    return selected;
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
    let exch = $(exchangeSwitchSelector).text();
    //Open Toggle Menu
    $(exchangeSwitchSelector).click();

    if (exch == "NSE") {
        //Select All Exchanges
        $('.allExchanges-29JoOLdp').click();
    } else {
        //Select NSE
        $('li.exchange-3hAo4mow:has(span.description-qad3kKDl:contains("National Stock Exchange of India"))').click();
    }
}

function toggleFlag() {
    $('.uiMarker__small-1LSfKnWQ').click();
    //To handle screener painting.
    onWatchListChange();
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
 * Filter WatchList Symbols
 * @param filter Filter Parameters
 * @param shift Shift to prevent Cleanup
 */
function filterWatchList(filter) {
    if (!filter.ctrl && !filter.shift) {
        //Hide Everything
        $(watchListLineSelector).hide();
        $(screenerLineSelector).hide();

        //Reset Filter
        filterChain = [filter];
    } else {
        //Add to Previous Filter
        filterChain.push(filter);
    }

    switch (filter.index) {
        case 1:
            if (filter.shift) {
                $(`${watchListLineSelector}:has(${watchListSymbolSelector}[style*='color: ${filter.color}'])`).hide();
                $(`${screenerLineSelector}:has(${screenerSymbolSelector}[style*='color: ${filter.color}'])`).hide();
            } else {
                $(`${watchListLineSelector}:has(${watchListSymbolSelector}[style*='color: ${filter.color}']):hidden`).show();
                $(`${screenerLineSelector}:has(${screenerSymbolSelector}[style*='color: ${filter.color}']):hidden`).show();
            }
            break;
        case 2:
            //Middle Mouse:
            resetWatchList();
            //Reset Filter
            filterChain = [];
            break;
        case 3:
            if (filter.shift) {
                $(`${watchListLineSelector}:has(${flagSelector}[style*='color: ${filter.color}'])`).hide();
                $(`${screenerLineSelector}:has(${flagSelector}[style*='color: ${filter.color}'])`).hide();
            } else {
                $(`${watchListLineSelector}:has(${flagSelector}[style*='color: ${filter.color}']):hidden`).show();
                $(`${screenerLineSelector}:has(${flagSelector}[style*='color: ${filter.color}']):hidden`).show();
            }
            break;
        default:
            message('You have a strange Mouse!'.fontcolor('red'));
    }
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
 * Remove All WatchList Filters
 */
function resetWatchList() {
    //Increase Widget Height to prevent Line Filtering.
    $('div.widgetbar-widgetbody:first').css('height', '20000px');

    //Show All Items
    $(watchListLineSelector).show();
    $(screenerLineSelector).show();

    //Disable List Transformation
    $(watchListLineSelector).css('position', '');
    $(watchListSelector).css('overflow', '');
}

/**
 * Delete all Alert lines by opening Object Tree
 */
function deleteAlertLines() {
    //Open Object Tree
    $('div.button-3SuA46Ww:nth(12)').click();

    //Delete Horizontal Lines
    waitJEE('div.wrap-ZwpHWy6f:contains("Horizontal Line")', (result) => {
        result.each((i, e) => {
            e.dispatchEvent(new MouseEvent('mouseover', {'bubbles': true}));
            $(e).find('.removeButton-qjvCYfQg').click();
        })
    })

    //Open Watch List Back (Even if no lines are found)
    setTimeout(() => {
        $('div.button-3SuA46Ww:first').click();

        //Gap required between reset and watch list paint only for this case.
        resetWatchList();

        //Refresh WatchList after some wait
        setTimeout(onWatchListChange,200);
    }, 2000);
}

// -- Feature Sets

// Event Handlers
function onWatchListChange() {
    waitOn("watchListChangeEvent", 2, () => {
        resetWatchList();

        saveWatchListTickers();
        paintWatchList();
        paintScreener();
        paintName();
        paintAlertFeedEvent();

        filterChain.forEach((f) => filterWatchList(f));
        // console.log("WatchList Changed");
    })
}

function onTickerChange() {
    waitOn("tickerChange", 200, () => {
        //console.log('Ticker Changed');

        //Fetch Alerts
        sendAlertRequest();

        //Fetch Orders
        gttSummary(GM_getValue(gttMapStore, {}));

        //Paint Name
        paintName();

        //Record Recent Ticker
        let recentEnabled = $(`#${recentId}`).prop('checked');
        let ticker = getTicker();
        if (recentEnabled && !recentTickers.has(ticker)) {
            recentTickers.add(ticker);
            paintScreener();
            paintAlertFeedEvent();
        }
    });
}

function onRefresh() {
    //Refresh Ticker
    onTickerChange();

    //Reconstruct Name Map on Refresh
    nameTickerMapMem = buildNameMap();

    //Clean Order Set after unfilter completes
    setTimeout(() => {
        orderSet.clean();
        orderSet.save();
    }, 1000);
}

function onRecentTickerReset() {
    let recentEnabled = $(`#${recentId}`).prop('checked');
    if (recentEnabled) {
        message('Recent Enabled'.fontcolor('green'))
    } else {
        recentTickers = new Set();
        paintScreener();
        paintAlertFeedEvent();
        message('Recent Disabled'.fontcolor('red'))
    }
}

function autoSave() {
    message("Auto Saving".fontcolor('green'));
    $(saveSelector).click()
}

// Painters
/**
 * Paints TV WatchList
 */
function paintWatchList() {
    //Reset Color
    resetColors(watchListSymbolSelector);

    //Paint Name and Flags
    paintTickers(watchListSymbolSelector);
    //Build Watch Summary
    watchSummary();

    //Mark FNO
    paintCss(watchListSymbolSelector, fnoSymbols, fnoCss);

    //console.log("Painting WatchList");
}

/**
 * Paints TV Screener Elements.
 */
function paintScreener() {
    //Must Run in this Order- Clear, WatchList, Kite
    resetColors(screenerSymbolSelector);

    //Paint Recently Watched
    paint(screenerSymbolSelector, recentTickers, 'purple');

    //Paint Fno
    paintCss(screenerSymbolSelector, fnoSymbols, fnoCss);

    //Paint Name and Flags
    paintTickers(screenerSymbolSelector);

    //Paint Watchlist (Overwrite White)
    paint(screenerSymbolSelector, orderSet.get(5), colorList[6]);

    //console.log("Painting Screener");
}

/**
 * Paints Name in Top Section if in WatchList
 */
function paintName() {
    let ticker = getTicker();
    $name = $(nameSelector);

    //Reset Name Color
    $name.css('color', colorList[5]);

    //Find and Paint if found in Watchlist
    for (let i = 0; i < colorList.length; i++) {
        if (orderSet.get(i).has(ticker)) {
            //Highlight
            $name.css('color', colorList[6]);
        }
    }

    //FNO Marking
    if (fnoSymbols.has(ticker)) {
        $name.css(fnoCss);
    } else {
        $name.css('border-top-style', '');
        $name.css('border-width', '');
    }

    //Flag Marking
    let $flag = $(`${flagSelector} > svg > path:nth(0)`);
    $flag.css('color', colorList[5]);
    $(exchangeSelector).css('color', colorList[5]);
    colorList.forEach((c, i) => {
        if (flagSet.get(i).has(ticker)) {
            $flag.css('color', c)
            $(exchangeSelector).css('color', c);
        }
    })
}

function paintAlertFeedEvent() {
    GM_setValue(tvWatchChangeEvent, {
        "watch": getWatchListTickers(false),
        "recent": Array.from(recentTickers)
    })
}

// PaintHelpers
function paintTickers(selector) {
    for (let i = 0; i < colorList.length; i++) {
        paint(selector, orderSet.get(i), colorList[i]);
        paintFlag(selector, flagSet.get(i), colorList[i]);
    }
}

function paint(selector, symbolSet, colour, force = false) {
    paintCss(selector, symbolSet, {'color': colour}, force);
}

function paintFlag(selector, symbols, colour, force = false) {
    $(`${selector}`).filter((i, e) => force || symbols.has(e.innerHTML))
        .parent().parent().parent().find(flagSelector).css('color', colour);
}

function paintCss(selector, symbolSet, css, force = false) {
    $(`${selector}`).filter((i, e) => force || symbolSet.has(e.innerHTML)).css(css);
}

function resetColors(selector) {
    paint(selector, null, colorList[5], true);
    paintFlag(selector, null, colorList[5], true);
}

// Order Handling

/**
 * Manages Sets
 */
class AbstractSet {
    storeId;
    setMap;

    constructor(storeId, count) {
        this.storeId = storeId;
        this.setMap = this.load(storeId, count);
    }

    /**
     * Load StoreId into a Map of Sets
     * @param storeId StoreId in GreaseMonkey
     * @param count Count of Sets required to be maintened
     * @returns SetMap with key as number and value as set of values.
     */
    load(storeId, count) {
        let setMap = new Map();
        let storeMap = GM_getValue(storeId, {});

        for (let i = 0; i < count; i++) {
            setMap.set(i, new Set(storeMap[i] || []));
        }
        // console.log('Loaded SetMap', setMap);
        return setMap;
    }

    save() {
        let storeMap = {}
        this.setMap.forEach((v, i) => storeMap[i] = [...v]);
        // console.log("Saving OrderSet", storeMap);
        GM_setValue(this.storeId, storeMap);
        return this.setMap;
    }

    toggle(listNo, ticker) {
        if (this.setMap.get(listNo).has(ticker)) {
            this.delete(listNo, ticker);
        } else {
            this.add(listNo, ticker);
        }
    }

    add(listNo, ticker) {
        this.setMap.get(listNo).add(ticker);
        message(`Ticker Watched: ${ticker}`.fontcolor(colorList[listNo]));

        //Post Process
        this.postAdd(listNo, ticker);
    }

    delete(listNo, ticker) {
        this.setMap.get(listNo).delete(ticker);
        message(`Ticker UnWatched: ${ticker}`.fontcolor(colorList[listNo]))
    }

    get(listNo) {
        return this.setMap.get(listNo);
    }

    set(listNo, set) {
        return this.setMap.set(listNo, set);
    }

    postAdd(listNo, ticker) {
        /* Remove from Any Other List except Current */
        this.setMap.forEach((v, i) => {
            if (i !== listNo && v.has(ticker)) {
                this.delete(i, ticker);
            }
        })
    }
}

class OrderSet extends AbstractSet {
    constructor() {
        super(orderInfoStore, colorList.length);
    }

    clean() {
        let watchListTickers = getWatchListTickers();
        this.setMap.forEach((v, i) => {
            for (let ticker of v) {
                //Remove All Tickers Not in WatchList
                if (!watchListTickers.includes(ticker)) {
                    this.delete(i, ticker)
                }
            }
        })
    }
}

class FlagSet extends AbstractSet {
    constructor() {
        super(flagInfoStore, colorList.length);
    }
}

/**
 * Records order for given ListNo.
 * @param listNo
 */
function recordOrder(listNo) {
    //Record Order
    orderSet.toggle(listNo, getTicker());
    orderSet.save();

    //Re-render
    onWatchListChange();
}

function recordFlag(listNo) {
    let selected = getSelection();

    //Toggle Selected Items
    selected.forEach((s) => flagSet.toggle(listNo, s));

    //Save
    flagSet.save();

    //Re-Render
    onWatchListChange();
}

function watchSummary() {

    $watchSummary = $(`#${summaryId}`);
    $watchSummary.empty();

    /**
     * Adds Count to Watch Summary
     * @param indexCount
     * @param colorIndex
     */
    function addCount(indexCount, colorIndex) {
        buildLabel(indexCount.toString() + '|', colorList[colorIndex]).data('color', colorList[colorIndex]).appendTo($watchSummary)
            .mousedown((e) => {
                filterWatchList({
                    color: $(e.target).data('color'),
                    index: e.which,
                    ctrl: e.originalEvent.ctrlKey,
                    shift: e.originalEvent.shiftKey
                });
            }).contextmenu(e => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    for (let i = 0; i < colorList.length; i++) {
        addCount(orderSet.get(i).size, i);
    }
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
    let exchange = "";

    //Read Symbol from Textbox or TradingView.
    let currentSymbol = $(`#${symbolId}`).val();
    if (currentSymbol === "") {
        //Use Ticker Symbol Original or Mapped
        symb = getMappedTicker();
    } else {
        //Use Input Box for Symbol and Include Exchange
        symb = currentSymbol;
        exchange = getExchange();
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
        }, exchange);
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
    let triggers = alertData.data.triggers;

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
    let result = {name: alrts.data.data.pairData.name, triggers: triggers};
    message(`Altz: ${result.name} - ${result.triggers ? result.triggers.length : 0}`.fontcolor('green'))
    return result;

}

//Fast Alert: Summary
function altRefresh() {
    waitOn('altRefresh', 1500, () => {
        //Locally Refresh Alerts
        sendAlertRequest();
    });
}

function sendAlertRequest() {
    //Search Symbol
    let symb = getMappedTicker();

    //Explicitly Clear alerts to avoid stale alerts.
    $(`#${altzId}`).empty();

    if (!isCompositeTicker(symb)) {
        //Skip Composite Symbols
        searchSymbol(symb, function (top) {
            GM_setValue(alertRequestKey, {id: top.pairId, date: new Date()});
        });
    }
}

function alertSummary(alertData) {
    let alrts = alertData.triggers;
    let ltp = readLtp();
    let $altz = $(`#${altzId}`);

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
    if (tvTicker !== investingTicker) {
        let tickerMap = GM_getValue(tickerMapStore, {});
        tickerMap[tvTicker] = investingTicker;
        GM_setValue(tickerMapStore, tickerMap);
        message(`Mapped Ticker: ${tvTicker} to ${investingTicker}`.fontcolor('yellow'));
    }
}

/**
 * Builds a Map of Investing Trimmed Name to TV Ticker
 */
function buildNameMap() {
    let nameTickerMapMem = {};

    //Load Pair Map with Investing Names
    let pairMap = GM_getValue(pairMapStore, {})
    //Load Investing to TV Ticker Map
    let investingToTVTickerMap = reverseMap(GM_getValue(tickerMapStore, {}))

    //Map Name to Ticker
    Object.keys(pairMap).forEach((investingTicker) => {
        //Trim Investing Name
        let trimmedName = trimInvestingName(pairMap[investingTicker].name);

        //Map to TV Ticker if Present
        let tvTicker = investingToTVTickerMap[investingTicker];

        //Map Trimmed Name to TV/Investing Ticker
        nameTickerMapMem[trimmedName] = tvTicker ? tvTicker : investingTicker;
    });

    return nameTickerMapMem;
}

//Hotkeys: TradingView Toolbar & Style
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 */
function timeframe(timeFrameIndex) {
    $(`#header-toolbar-intervals > div:nth-child(${(getTimeFrameIndex(timeFrameIndex))})`).click();
    GM_setValue(styleIndexStore, timeFrameIndex);
}

function getTimeFrameIndex(styleIndex) {
    var tIndex = timeFrameBar[styleIndex];

    //TTF (Hourly) Exchange Specific
    if (styleIndex === 3) {
        switch (getExchange()) {
            //2 Hourly Index
            case "NSE":
                break;
            default:
                //4 Hourly Index
                tIndex = tIndex + 1;
        }
    }

    //Adjust for Scalping in Scalp Mode. To Cater to 2H Skip Adjustments are different.
    tIndex = scalpModeOn ? tIndex - (styleIndex > 1 ? 3 : 2) : tIndex;

    return tIndex;
}

function toggleScalp() {
    scalpModeOn = !scalpModeOn;
    if (scalpModeOn) {
        message(`ScalpMode Enabled`.fontcolor('green'));
    } else {
        message(`ScalpMode Disabled`.fontcolor('red'));
    }
}

/**
 * Based on Provided Positions Select Appropriate Style
 * @param positions
 */
function timeframeStyle(positions) {
    let index = GM_getValue(styleIndexStore);

    //TODO: Hack Improve on Styles for Scalping
    if (scalpModeOn) {
        if (index > 1) {
            //In Scalp Mode Use HTF Style for ITF, TTF as well
            index = 3;
        } else {
            //VHTF, HTF Shift By Two Timeframes for Scalping
            index += 2;
        }
    }

    style(positions[index]);
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
        .append(buildButton(refreshId, 'R', onRefresh))
        .append(buildCheckBox(recentId, false).change(onRecentTickerReset))
        .append(buildWrapper(summaryId));

    buildWrapper('aman-mid').appendTo(`#${areaId}`)
        .append(buildInput(symbolId))
        .append(buildInput(priceId).keypress(onPriceKeyPress));

    buildWrapper(altzId).appendTo(`#${areaId}`);
    buildWrapper(ordersId).appendTo(`#${areaId}`);
}