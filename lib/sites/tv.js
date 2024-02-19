/** Selectors **/
//Top Header
const headerSelector = '#header-toolbar-symbol-search';
const tickerSelector = `${headerSelector} > div`;
const saveSelector = '#header-toolbar-save-load';
const symbolFlagSelector = 'div[class*=flagWrapper]';
const timeframeSelector = `#header-toolbar-intervals > div[class*=group] > button`;

//Name, Exchange, Prices
const nameSelector = 'div[class*=mainTitle]';
const exchangeSelector = 'div[class*=exchangeTitle]';

//Popups
const searchPopupSelector = 'input[class^=search]';
const replayActiveSelector = '#header-toolbar-replay[class*=isActive]';
const replayPlayPauseSelector = 'div[class*=replayToolbar] span[class*=icon]:nth(1)'
const autoAlertSelector = "span:contains(\'Copy price\')"

//Order Panel
const orderPanelCloseSelector = 'div[data-name=button-close]';
const orderQtySelector = 'div[class^=units] input';
const orderInputSelector = 'span[class^=group] input';

//Text Box
const closeTextboxSelector = 'button:contains("Ok")';
const reasons = ['dep', 'ooa', 'tiz', 'oe', 'tto'];

//Exchange
const currentExchangeSelector = 'div[class^=exchange]:first';
const exchangeSwitchSelector = 'div[class^=flagWrap]';
const nseSelector = 'div[class^=textBlock] > div:contains("India")';
const allExchangeSelector = 'div[class^=textBlock] > div:contains("All")';

//Watchlist Hidden Description Box
const ltpSelector = 'span[class^=priceWrapper] > span:first';

//Screener
const screenerSelector = "tbody.tv-data-table__tbody:nth(1)";
const screenerLineSelector = `tr.tv-screener-table__result-row`;
const screenerSymbolSelector = '.tv-screener__symbol';
const screenerSelectedSelector = '.tv-screener-table__result-row--selected';
const screenerButtonSelector = 'button[data-name=toggle-visibility-button]';

//Watchlist
const watchListWidgetSelector = 'div.widgetbar-widgetbody:first';
const watchListSelector = `div[class^=listContainer]`;
const watchListItemSelector = `div[class*=symbol-]`;
const watchListLineSelector = `${watchListSelector} > div > div`;
const watchListSymbolSelector = 'span[class*=symbolNameText]';
const watchListSelectedSelector = 'div[class*=selected]';
const flagSelector = "div[class^=uiMarker]";
const flagMarkingSelector = `${flagSelector} > svg > path:nth(0)`;

//Toolbars
let toolbarSelector = 'span.tv-favorited-drawings-toolbar__widget'
let styleSelector = 'div.floating-toolbar-react-widgets__button';
let styleItemSelector = `span[class^=label]`;

//Sidebar
const deleteArrowSelector = 'div [data-name="removeAllDrawingTools"] button[class^=arrow]';
const deleteDrawingSelector = 'div [data-name="remove-drawing-tools"]';

//Stores
const dataSiloStore = 'dataSilo';
const orderInfoStore = 'orderInfo';
const flagInfoStore = 'flagInfo';

//Inmemory Stores
var scalpModeOn;
var filterChain = [];
var styleIndex = 0;

//Loaded Data
var dataSilo;
var recentTickers;
var alertMap;

var orderSet;
var flagSet;

//Replay
var replayCron = false;
var runReplay = false;

//Events/Signals
//TODO:Delete Alert Keys
const alertRequestKey = "alertRequest";
const alertResponseKey = "alertResponse";
const gttRequest = "gttRequest";

//UI Ids
const swiftId = 'aman-swift';
const summaryId = 'aman-summary';
const inputId = 'aman-input';
const priceId = 'aman-price';
const gttId = 'aman-gtt';
const refreshId = 'aman-refresh';
const recentId = 'aman-recent';
const altzId = 'aman-altz';
const ordersId = 'aman-orders';
const trelloId = 'aman-trello';

//Constants
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'];
const fnoCss = {
    'border-top-style': 'groove',
    'border-width': 'medium'
};
const NSE_EXCHANGE = "NSE";

//Style
const styleMap = {
    3: "I",
    4: "H",
    5: "VH",
    6: "T",
    7: "I"
}

const timeframeMap = {
    3: "D",
    4: "WK",
    5: "MN",
    6: "TMN",
    7: "SMN"
}

// Constants VHTF,HTF,ITF,TTF
const timeFrameBar = {
    "DEFAULT": [6, 5, 4, 3],
    "NSE": [6, 5, 4, 3],
    "SCALP": [7, 6, 5, 4]
}

//Data Loaders/Storeres
function loadTradingViewVars() {
    orderSet = new OrderSet();
    flagSet = new FlagSet();
    loadDataSilo();
}

function loadDataSilo() {
    dataSilo = GM_getValue(dataSiloStore, {});
    recentTickers = new Set(dataSilo.recentTickers);
    //Enable/Disable Recent based on weather previous state had recent Tickers
    $(`#${recentId}`).prop('checked', recentTickers.size > 0)
}

function saveDataSilo() {
    dataSilo.recentTickers = [...recentTickers];
    GM_setValue(dataSiloStore, dataSilo);
}

// -- Info Readers
function getName() {
    return $(nameSelector)[0].innerHTML;

}

function getTicker() {
    return $(tickerSelector).html();
}

function getExchange() {
    return $(exchangeSelector).text();
}

/**
 * Reads the last traded price from the DOM and returns it as a floating point number.
 *
 * @return {number} The last traded price as a floating point number.
 */
function readLastTradedPrice() {
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
function getListTickers(selector, visible = false) {
    return $(visible ? selector + ":visible" : selector).toArray().map(s => s.innerHTML);
}

function getWatchListTickers(visible = false) {
    return getListTickers(watchListSymbolSelector, visible);
}

/**
 *  Saves Watch List and Composite Tickers
 *  to Order Set.
 */
function saveWatchListTickers() {
    //Parse Watch List
    let watchListTickers = getWatchListTickers();

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
    return $(`${watchListSelectedSelector} ${watchListSymbolSelector}:visible`).toArray().map(s => s.innerHTML);
}

/**
 * Moves ahead or back based on Step size in Visible Tickers.
 * Uses screener tickers if visible or falls back to Watch list.
 * @param step Number of steps to move
 */
function navigateTickers(step) {
    //Next visible in Tickers
    let visibleTickers = isScreenerVisible() ? getScreenerList(true) : getWatchListTickers(true);
    let index = visibleTickers.indexOf(getTicker());
    let nextIndex = index + step;
    if (nextIndex < 0) {
        // Move to last element
        nextIndex = visibleTickers.length - 1
    } else if (nextIndex === visibleTickers.length) {
        //Move to First element
        nextIndex = 0;
    }
    console.log(visibleTickers[nextIndex], index, nextIndex);
    openTicker(visibleTickers[nextIndex]);
}

// Screener
function getScreenerSelected() {
    return $(`${screenerSelectedSelector} ${screenerSymbolSelector}:visible`).toArray().map(s => s.innerHTML);
}

function getScreenerList(visible = false) {
    return getListTickers(screenerSymbolSelector, visible);
}

function isScreenerVisible() {
    return $(screenerButtonSelector).attr('data-active') === 'false';
}

function getSelection() {
    //Get Selected Items
    let selected = getWatchListSelected().concat(getScreenerSelected());

    //Use Active Ticker if Non Multiple Selection
    if (selected.length < 2) {
        selected = [getTicker()];
    }
    return selected;
}

// OrderPanel
function readOrderPanel() {
    let qty = parseFloat($(orderQtySelector).val());
    let sl = parseFloat($(orderInputSelector + ':nth(4)').val());
    let ent = parseFloat($(orderInputSelector + ':nth(0)').val());
    let tp = parseFloat($(orderInputSelector + ':nth(2)').val());
    return { qty, sl, ent, tp };
}

// -- TV Actions
/**
 * Switch TradingView Exchange
 */
function toggleExchange() {
    let exch = $(currentExchangeSelector).text();
    //Open Toggle Menu
    $(exchangeSwitchSelector).click();

    if (exch === "India") {
        //Select All Exchanges
        $(allExchangeSelector).click();
    } else {
        //Select NSE
        $(nseSelector).click();
    }
}

function toggleFlag() {
    $(symbolFlagSelector).click();
    //To handle screener painting.
    onWatchListChange();
}

// Replay
function toggleReplay() {
    //Toggle Play Pause
    $(replayPlayPauseSelector).click();

    //Start Replay Cron if Replay Mode is Active & Cron is Stopped
    if (isReplayActive() && replayCron == false) {
        //Start Auto Replay Cron
        message("Replay Cron Started".fontcolor('orange'));
        replayCron = setInterval(autoReplay, 2 * 1000);
    }

    //Toggle Expected Replay State with approprioate messages if in Replay Mode
    if (replayCron) {
        if (runReplay) {
            message("Exiting Replay Mode".fontcolor('yellow'));
            //Indicate Cron to Stop Replay
            runReplay = false;
        } else {
            message("Entering Replay Mode".fontcolor('green'));
            //Indicate Cron to Start Replay
            runReplay = true;
        }
    }
}


function isReplayActive() {
    return $(replayActiveSelector).length > 0;
}

function clearAll() {
    waitJClick(deleteArrowSelector, () => {
        waitJClick(deleteDrawingSelector)
    })
}

function closeTextBox() {
    // Textbox Ok
    $(closeTextboxSelector).click()
}

/**
 * Opens Given Ticker in Trading View.
 * @param ticker
 */
function openTicker(ticker) {
    //Resolve Ticker to Pinned Ticker If Present
    let pinTicker = dataSilo.tvPinMap[ticker]
    ticker = pinTicker ? pinTicker : ticker;

    //Opens Search Box
    waitClick(tickerSelector)

    //Open Relative Ticker
    waitInput(searchPopupSelector, ticker);
}

/**
 * Opens Current Ticker Relative to Benchmark.
 * Eg. Stock to Nifty, Crypto to Bitcoin etc
 */
function relativeTicker() {
    let ticker = getTicker();
    let benchmark;
    switch (getExchange()) {
        case 'MCX':
            benchmark = 'MCX:GOLD1!'
            break;
        case NSE_EXCHANGE:
            benchmark = 'NIFTY'
            break;
        case 'BINANCE':
            benchmark = 'BINANCE:BTCUSDT'
            break;
        default:
            benchmark = 'XAUUSD'
    }
    openTicker(`${ticker}/${benchmark}`)
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
                $(`${watchListLineSelector}:not(:has(${watchListSymbolSelector}[style*='color: ${filter.color}']))`).hide();
                $(`${screenerLineSelector}:not(:has(${screenerSymbolSelector}[style*='color: ${filter.color}']))`).hide();
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
    $(watchListWidgetSelector).css('height', '20000px');

    //Show All Items
    $(watchListLineSelector).show();
    $(screenerLineSelector).show();

    //Disable List Transformation
    $(watchListLineSelector).css('position', '');
    $(watchListSelector).css('overflow', '');
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
    //HACK: Make Event Based when New Ticker Appears
    waitOn("tickerChange", 150, () => {
        //console.log('Ticker Changed');

        //Fetch Alerts
        altRefresh()

        //Fetch Orders
        gttSummary(GM_getValue(gttOrderEvent, {}));

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

    //Refresh Alerts
    fetchAlerts()

    //Clean Order Set after unfilter completes
    setTimeout(() => {
        let cleanCount = orderSet.clean();
        //Prompt in case of mass deletion to prevent accidental deletion
        cleanCount > 4 && confirm(`Multiple Items Deleted: ${cleanCount}. Save ?`) && orderSet.save();
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

function onInputChange() {
    //Open Ticker in InputBox (Pasted from Clipboard)
    if ($(this).val().endsWith("!")) {
        openTicker($(this).val().substring(0, $(this).val().length - 1));
        clearFields();
    }
}

// Crons
function autoSave() {
    message("Auto Saving".fontcolor('green'));
    $(saveSelector).click();
    saveDataSilo();
}

function autoReplay() {
    if (isReplayActive()) {
        let $playPause = $(replayPlayPauseSelector)
        let replayRunning = !$($playPause).find('svg > path').attr('d').includes('m10.997');

        // console.log(`Replay! Expected: ${runReplay}, Actual: ${replayRunning}`)

        //Match Expected and Actual State by Starting or Stopping Replay
        if (runReplay != replayRunning) {
            $playPause.click();
        }
    } else {
        //Stop Cron when Replay is Not Active
        clearInterval(replayCron);
        replayCron = false;
        message("Replay Cron Stoped".fontcolor('orange'));
    }
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
    paint(screenerSymbolSelector, recentTickers, colorList[3]);

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
        //Highlight Non White if in Watchlist or Color respectively
        let color = i === 5 ? colorList[6] : colorList[i];
        if (orderSet.get(i).has(ticker)) {
            $name.css('color', color);
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
    let $flag = $(flagMarkingSelector);
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
        "watch": getWatchListTickers(),
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
    paintCss(selector, symbolSet, { 'color': colour }, force);
}

function paintFlag(selector, symbols, colour, force = false) {
    $(`${selector}`).filter((i, e) => force || symbols.has(e.innerHTML))
        .parents(watchListItemSelector).find(flagSelector).css('color', colour);
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
        let count = 0;
        let watchListTickers = getWatchListTickers();
        this.setMap.forEach((v, i) => {
            for (let ticker of v) {
                //Remove All Tickers Not in WatchList
                if (!watchListTickers.includes(ticker)) {
                    count++;
                    this.delete(i, ticker)
                }
            }
        })
        return count;
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
    recordSet(orderSet, listNo);
}

function recordFlag(listNo) {
    recordSet(flagSet, listNo);
}

function recordSet(set, listNo) {
    let selected = getSelection();

    //Toggle Selected Items
    selected.forEach((s) => set.toggle(listNo, s));

    //Save
    set.save();

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
    //Read Symbol from TradingView, Order Panel.
    let order = readOrderPanel();
    //Fix Ticker to Match Broker Platform
    order.symb = getTicker();
    order.ltp = readLastTradedPrice();

    //Get Symbol from Input if Given
    let input = $(`#${inputId}`).val();
    if (input)
        order.symb = input

    //Close Order Panel
    $(orderPanelCloseSelector).click()

    //console.log(`GTT ${qty}- ${sl} - ${ent} - ${tp}`);

    //Build Order and Display
    message(`${order.symb} (${order.ltp}) Qty: ${order.qty}, ${order.sl} - ${order.ent} - ${order.tp}`.fontcolor('yellow'));

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
    GM_setValue(gttRequest, { id: id });
}

//Fast Alert: Common
function onSymbolKeyPress(e) {
    if (e.keyCode === 13) {
        setMapping();
    }
}

function onPriceKeyPress(e) {
    if (e.keyCode === 13) {
        setAlert();
    }
}

function focusInput() {
    $(`#${inputId}`).focus();
}

function clearFields() {
    $(`#${inputId}`).val("");
    $(`#${priceId}`).val("");
}

function autoAlert(func) {
    //Wait for Add Alert Context Menu Option
    waitJEE(autoAlertSelector, function (el) {
        let regExp = /[+-]?\d+(\.\d+)?/g;
        let match = regExp.exec(el.text());
        let altPrice = parseFloat(match[0])

        //Call Function with Char Alert Price
        // console.log("Text", el.text(),"Match", match, "Alert", altPrice);
        func(altPrice);
    });
}

//Fast Alert: Set
/**
 * Map Current TV Ticker to
 * Investing TickerOnly: T=DHLF
 * Investing TickerWithExchange: E=NSE:DHFL
 * Investing AlertName: A=Divis Lab
 * TradingView PinExchange: P=NSE
 */
function setMapping() {
    //Get TradingView Ticker
    let tvTicker = getTicker();
    //Get Symbol Input
    let input = $(`#${inputId}`).val();
    if (input) {
        let actionSplit = input.split("=");
        if (actionSplit.length === 2) {
            //Extract Action and Value
            let action = actionSplit[0];
            let value = actionSplit[1];

            //Switch on Action
            switch (action) {
                case "T":
                    //Map Symbol to Current TV Ticker
                    mapTicker(tvTicker, value);
                    break;
                case "E":
                    //Extract Exchange and Symbol
                    let exchangeSplit = value.split(":");
                    let exchange = exchangeSplit[0];
                    let symbol = exchangeSplit[1];

                    //Map Symbol to Current TV Ticker
                    mapTicker(tvTicker, symbol);
                    //Set Proper Pair Id based on Exchange
                    searchSymbol(symbol, () => {
                    }, exchange)
                    break;
                case "A":
                    //Map AlertName to Current TV Ticker
                    mapAlertName(tvTicker, value);
                    break;
                case "P":
                    //Map Passed Exchange (EXCH:Ticker) to Current TV Ticker
                    pinTicker(tvTicker, `${value}:${tvTicker}`);
            }
        } else {
            message("Invalid Map Format. Provide Action=Value".fontcolor("red"))
        }

        //Clear Inputs
        clearFields();
    }
}

class Alert {
    Id
    Price
    PairId

    constructor(pairId, price) {
        this.PairId = pairId;
        this.Price = price;
    }
}

function fetchAlerts() {
    getAllAlerts(saveAlerts);
}

/**
 * Parses Alert Data and loads into Alert Map
 * @param data
 */
function saveAlerts(data) {
    alertMap = new Map();
    let count = 0

    //Parse Html Data and extract price alerts
    $('<div/>').html(data).find('.js-alert-item[data-trigger=price]').each((i, alertText) => {
        const $alt = $(alertText);

        //Construct Alert
        let alert = new Alert();
        alert.Id = $alt.attr('data-alert-id');
        alert.Price = parseFloat($alt.attr('data-value'));
        alert.PairId = parseFloat($alt.attr('data-pair-id'));

        //Get Alerts for this Alert Name
        let alerts = alertMap.get(alert.PairId) || [];
        //Add Alert
        count++
        alerts.push(alert)
        //Update Map
        alertMap.set(alert.PairId, alerts);
    });

    //console.log(alertMap);
    message("Alerts Loaded: " + count)

    //Reload UI Alerts
    altRefresh();
}

/**
 * Add Alert without Alert Id
 * @param pairId
 * @param price
 */
function addAlert(pairId, price) {
    let alerts = alertMap.get(pairId) || [];
    alerts.push(new Alert(pairId, price));
    alertMap.set(pairId, alerts);

    altRefresh();
}

/**
 * Removes Alert from Alert Map. Doesn't save it.
 * @param pairId
 * @param alertId
 */
function removeAlert(pairId, alertId) {
    let alerts = alertMap.get(pairId) || [];
    alerts = alerts.filter(item => item.Id != alertId)
    alertMap.set(pairId, alerts);

    altRefresh();
}

function setAlert() {
    let symb = getMappedTicker();
    let price = $(`#${priceId}`).val();

    if (price) {
        //Split Alert Prices
        let split = price.trim().split(" ");

        //Search Symbol
        searchSymbol(symb, function (top) {
            message(top.name + ': ');

            //Set Alerts
            for (let p of split) {
                createAlert(top.pairId, p, addAlert);
            }

            //Clear Values
            setTimeout(clearFields, 10000);
        });
    }
}

/**
 * Trigger AutoAlert Create by reading Price and creating alert.
 */
function autoAlertCreate() {
    autoAlert((altPrice) => {
        searchSymbol(getMappedTicker(), function (top) {
            createAlert(top.pairId, altPrice, addAlert);
        });
    })
}


//Fast Alert: Delete
function onAlertDelete(evt) {
    let $target = $(evt.currentTarget);
    let alt = $target.data('alt');
    deleteAlert(alt, removeAlert);
}

function resetAlerts() {
    //Go over Alert Buttons
    $('#aman-altz > button').each((i, e) => {
        $(e).click();
    });
}

function autoAlertDelete() {
    autoAlert((altPrice) => {
        //Tolerance for price search (3%)
        let tolerance = altPrice * 0.03;

        //Go over Alert Buttons
        $('#aman-altz > button').each((i, e) => {
            let $e = $(e);
            let buttonPrice = parseFloat($e.text());
            //Delete Alert if its near alert Price
            if ((altPrice - tolerance) < buttonPrice && buttonPrice < (altPrice + tolerance)) {
                $e.click();
            }
        });
    })
}

/**
 * Filters Price Alerts and maps to price,id
 * @param alrts Alerts Response
 * @returns {{name: any, triggers: (number|{price: number, id: any}[])}}
 */
function getTriggers(alrts) {
    let triggers = alrts.data.data.price && alrts.data.data.price.filter(p => p.alert_trigger === "price").map(p => {
        return { id: p.alertId, price: parseFloat(p.conditionValue) };
    });
    let result = { name: alrts.data.data.pairData.name, triggers: triggers };
    message(`Altz: ${result.name} - ${result.triggers ? result.triggers.length : 0}`.fontcolor('green'))
    return result;

}

//Fast Alert: Summary
function altRefresh() {
    waitOn('altRefresh', 10, () => {
        //Locally Refresh Alerts
        sendAlertRequest();
    });
}

function sendAlertRequest() {
    //Search Symbol
    let symb = getMappedTicker();

    //Explicitly Clear alerts to avoid stale alerts.
    $(`#${altzId}`).empty();

    if (!orderSet.get(7).has(symb)) {
        //Skip Composite Symbols
        searchSymbol(symb, function (top) {
            //TODO: Cleanup
            // GM_setValue(alertRequestKey, {id: top.pairId, date: new Date()});
            alertSummary(alertMap.get(top.pairId))
        });
    }
}

function alertSummary(alertData) {
    let ltp = readLastTradedPrice();
    let $altz = $(`#${altzId}`);

    // Add Alert Buttons
    if (alertData) {
        alertData.sort(((a, b) => {
            return a.Price - b.Price;
        })).forEach((alt) => {
            let priceString = alt.Price.toString();
            //Alert Below Price -> Green, Above -> Red, Unverified -> Orange
            let coloredPrice = alt.Id === undefined ? priceString.fontcolor('orange') : alt.Price < ltp ? priceString.fontcolor('seagreen') : priceString.fontcolor('orangered');

            //Add Deletion Button
            buildButton("", coloredPrice, onAlertDelete).data('alt', alt).appendTo($altz);
        });
    } else {
        buildLabel("No AlertZ", 'red').appendTo($altz);
    }
}

/**
 * Generates a summary of the GTT orders for a given ticker
 * in Info Area.
 *
 * @param {object} m - The object containing the GTT orders.
 * @return {undefined} This function does not return a value.
 */
function gttSummary(m) {
    let orders = m[getTicker()];
    let $orders = $(`#${ordersId}`);
    //Clear Old Orders
    $orders.empty();

    //If Orders Found for this Ticker
    if (orders) {
        //Add GTT Buttons
        orders.reverse().forEach((order) => {
            let shortType = order.type.includes('single') ? "B" : "SL";
            //Extract Buy Price for Single order and Target for Two Legged
            let price = order.type.includes('single') ? order.prices[0] : order.prices[1];
            let ltp = readLastTradedPrice();
            // Compute percent Difference from trigger price to LTP
            let percent = Math.abs(price - ltp) / ltp;
            // console.log(order.type, price, ltp, percent);
            // Color Code far Trigger to red
            let color = percent > 2 ? 'yellow' : 'lime';
            buildButton("", `${shortType}-${order.qty} (${price})`.fontcolor(color), onDeleteGtt).data('order-id', order.id).appendTo($orders);
        })
    }
}

//Fast Alert: Helpers
function getMappedTicker() {
    return resolveTicker(getTicker());
}

function resolveTicker(tvTicker) {
    // Use Investing Ticker if available
    let investingTicker = dataSilo.tickerMap[tvTicker];
    if (investingTicker) {
        tvTicker = investingTicker;
    }

    //console.log(tvTicker,investingTicker);
    return tvTicker;
}

function mapTicker(tvTicker, investingTicker) {
    if (tvTicker !== investingTicker) {
        dataSilo.tickerMap[tvTicker] = investingTicker;
        message(`Mapped Ticker: ${tvTicker} to ${investingTicker}`.fontcolor('yellow'));
    }
}

function pinTicker(tvTicker, pinnedTvTicker) {
    dataSilo.tvPinMap[tvTicker] = pinnedTvTicker;
    message(`Pinned Ticker: ${tvTicker} to ${pinnedTvTicker}`.fontcolor('yellow'));
}

function mapAlertName(tvTicker, alertName) {
    dataSilo.alertNameMap[alertName] = tvTicker;
    message(`Mapped Alert Name: ${alertName} to ${tvTicker}`.fontcolor('yellow'));
}

function currentTimeframe() {
    return timeframeMap[styleIndex];
}

//Trello Cards
function createCard() {
    //Get Timeframe from Button
    let timeframe = this.id;

    ReasonPrompt(function (reason) {
        //Get Ticker
        let ticker = getTicker();

        //Not Taken Settings
        let type = "rejected";

        if (orderSet.get(2).has(ticker)) {
            //Taken Settings
            type = "set"
        } else if (orderSet.get(0).has(ticker) || orderSet.get(1).has(ticker) || orderSet.get(4).has(ticker)) {
            type = "result"
        } else {
            if (reason) {
                type = type + "." + reason
            }
        }

        //Put All in Journal with Type
        ClipboardCopy(ticker + "." + timeframe + "." + type);
    })
}

function ReasonPrompt(callback) {
    //Disable SwiftKeys
    toggleSwiftKeys(false);

    //Prompt
    SmartPrompt(reasons).then(callback);

    //Enable SwiftKeys
    toggleSwiftKeys(true);
}

function ClipboardCopy(text) {
    GM_setClipboard(text);
    message(`ClipCopy: ${text}`.fontcolor('yellow'))
}

//Hotkeys: TradingView Toolbar & Style
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 */
function timeframe(timeFrameIndex) {
    styleIndex = getStyleIndex(timeFrameIndex);
    $(`${timeframeSelector}:nth-child(${styleIndex})`).click();
}

function getStyleIndex(timeFrameIndex) {
    var styleName = getExchange() === NSE_EXCHANGE ? NSE_EXCHANGE : "DEFAULT";
    styleName = scalpModeOn ? "SCALP" : styleName;

    // console.log(styleName, index, timeFrameBar[styleName][index])
    return timeFrameBar[styleName][timeFrameIndex];
}

function toggleScalp() {
    scalpModeOn = !scalpModeOn;
    if (scalpModeOn) {
        message(`<span style="color: green;">ScalpMode Enabled</span>`);
    } else {
        message(`<span style="color: red;">ScalpMode Disabled</span>`);
    }
}

/**
 * Based on Style Index (Timeframe) and Style Type Apply Style
 * @param styleType
 */
function timeframeStyle(styleType) {
    if (styleType == "DZ")
        style(styleMap[styleIndex] + "DZ");
    else
        style(styleMap[styleIndex] + "SZ");
}

/**
 * Clicks Favourite Toolbar on Given Index
 * @param index
 */
function favToolbar(index) {
    $(`${toolbarSelector}:nth(${index})`).click()
}

/**
 * Supply/Demand Zone Identifier
 * @param id
 */
function style(id) {
    // Template Selector
    waitClick(styleSelector, () => {
        //Clicks Style based on Index.
        waitJClick(`${styleItemSelector}:contains(${id})`)
    })
}

// -- UI Setup
function setupFastAlertUI() {
    buildArea(areaId, '76%', '6%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildCheckBox(swiftId, false).change(fixTitle))
        .append(buildButton(gttId, 'G', setGtt))
        .append(buildButton(refreshId, 'R', onRefresh))
        .append(buildButton(refreshId, 'T', () => {
            toggleUI('#aman-trello')
        }))
        .append(buildCheckBox(recentId, false).change(onRecentTickerReset))
        .append(buildWrapper(summaryId));

    buildWrapper('aman-mid').appendTo(`#${areaId}`)
        .append(buildInput(inputId).keypress(onSymbolKeyPress))
        .append(buildInput(priceId).keypress(onPriceKeyPress));

    buildWrapper(altzId).appendTo(`#${areaId}`);
    buildWrapper(ordersId).appendTo(`#${areaId}`);
    buildWrapper(trelloId).hide().appendTo(`#${areaId}`);

    trelloSectionUI();
}

function trelloSectionUI() {
    //Trello Section
    buildWrapper('aman-trello-type').appendTo(`#${trelloId}`)
        .append(buildButton('mwd.trend', "M-T", createCard).data('id', '5e37123b78179482bfbaba7c'))
        .append(buildButton('mwd.ctrend', "M-CT", createCard).data('id', '5e371210e096bb0fc7feb409'))
        // TODO: Rely on Scalp Mode and Remove Extra Buttons
        .append(buildButton('stw.trend', "6-T", createCard).data('id', '5e3712cfb57c1210b4627055'))
        .append(buildButton('stw.ctrend', "6-CT", createCard).data('id', '5e3712df7f1630869f9d559d'));
}