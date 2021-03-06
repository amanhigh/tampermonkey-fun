/** Selectors **/
//Top Header
const headerSelector = '#header-toolbar-symbol-search';
const tickerSelector = `${headerSelector} > div`;
const saveSelector = '#header-toolbar-save-load';
const symbolFlagSelector = 'div.flagWrapper-2KhwsEwE';
const timeframeSelector = `#header-toolbar-intervals > div`;

//Name, Exchange, Prices
const nameSelector = 'div.title1st-2KhwsEwE';
const exchangeSelector = '.title3rd-2KhwsEwE';

//Popups
const searchPopupSelector = 'input.search-Hsmn_0WX';
const replayPlayPauseSelector = 'tv-replay-toolbar__button:nth(1)'
const autoAlertSelector = ".label-f5BaKrKq:contains(\'Add Alert\')"

//Order Panel
const orderPanelCloseSelector = '.button-DLF_qDKI';
const orderQtySelector = '.units-1CVEPTwn input';
const orderInputSelector = '.group-53Nt0Fj1 input';

//Exchange
const exchangeSwitchSelector = '.flagWrap-1Xy6iEIs';
const exchangeResultLineSelector = '.exchangeName-ZzQNZGNo:first';
const allExchangeSelector = 'div.textBlock-2TpXRNRX > div.title-2TpXRNRX:contains("All Exchanges")';
const nseSelector = 'div.textBlock-2TpXRNRX > div.description-2TpXRNRX:contains("National Stock Exchange of India")';

//TextBox
const textBokStyleSelector = 'div.container-2TPkxppK:nth-child(1)';
const textBoxStyleLineSelector = '.menuBox-g78rwseC > div:nth-child(4) > div:nth-child(1)';
const textAreaSelector = '.textarea-3SUhemf2';

//Watchlist Hidden Description Box
const ltpSelector = 'span.price-3PT2D-PK';

//Screener
const screenerSelector = "tbody.tv-data-table__tbody:nth(1)";
const screenerLineSelector = `tr.tv-screener-table__result-row`;
const screenerSymbolSelector = '.tv-screener__symbol';
const screenerSelectedSelector = '.tv-screener-table__result-row--selected';
const screenerButtonSelector = '.button-3rEcU9Zs:first';

//Watchlist
const watchListWidgetSelector = 'div.widgetbar-widgetbody:first';
const watchListSelector = `.listContainer-3U2Wf-wc`;
const watchListLineSelector = `${watchListSelector} > div > div`;
const watchListSymbolSelector = 'span.symbolNameText-EJ_LFrif';
const watchListSelectedSelector = '.selected-1a1_EyKG';
const flagSelector = "div.uiMarker-1PBS_wt6";
const flagMarkingSelector = `${flagSelector} > svg > path:nth(0)`;

//Toolbars
let styleSelector = 'div.floating-toolbar-react-widgets__button';
let styleItemSelector = `tr.item-f5BaKrKq:nth`;

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

var orderSet;
var flagSet;

//Intervals
var replayCron = false;

//Events/Signals
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
const trelloId = 'aman-trello';

//Constants
const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'];
const fnoCss = {
    'border-top-style': 'groove',
    'border-width': 'medium'
};

const lineMenu = [4, 1, 2, 3];
const demandMenu = [8, 2, 4, 6];
const supplyMenu = [9, 3, 5, 7];

// Constants VHTF,HTF,ITF,TTF
const timeFrameBar = {
    "DEFAULT": [8, 7, 6, 5],
    "NSE": [8, 7, 6, 4],
    "SCALP": [5, 3, 2, 1]
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
    // console.log(visibleTickers, index, nextIndex);
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
    return {qty, sl, ent, tp};
}

// -- TV Actions
/**
 * Switch TradingView Exchange
 */
function toggleExchange() {
    let exch = $(exchangeResultLineSelector).text();
    //Open Toggle Menu
    $(exchangeSwitchSelector).click();

    if (exch === "NSE") {
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

function toggleReplay() {
    //Toggle Play Pause
    $(`.${replayPlayPauseSelector}`).click();

    if (replayCron) {
        message("Exiting Replay Mode".fontcolor('yellow'));
        //Stop Cron
        clearInterval(replayCron);
        replayCron = false;
    } else {
        message("Entering Replay Mode".fontcolor('green'));
        //Start Auto Replay Cron
        replayCron = setInterval(autoReplay, 2 * 1000);
    }
}

/**
 * Handles Opening TextBox and Disabling SwiftKeys
 */
function textBox() {
    //Disable SwiftKeys
    toggleSwiftKeys(false);

    //Select Day Style
    waitClick(textBokStyleSelector); // Click Style
    waitClick(textBoxStyleLineSelector); // Select Day

    //Select Text Area
    waitEE(textAreaSelector, (e) => e.focus());
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
        case 'BINANCE':
            benchmark = 'BINANCE:BTCUSDT'
            break;
        default:
            benchmark = 'NIFTY'
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

/**
 * Delete all Alert lines by opening Object Tree
 */
//TODO:Cleanup
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
        setTimeout(onWatchListChange, 300);
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
    waitOn("tickerChange", 300, () => {
        //console.log('Ticker Changed');

        //Fetch Alerts
        sendAlertRequest();

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

// Crons
function autoSave() {
    message("Auto Saving".fontcolor('green'));
    $(saveSelector).click();
    saveDataSilo();
}

function autoReplay() {
    let $playPause = $(`.${replayPlayPauseSelector}`)
    //Check If we are paused then Replay
    if ($($playPause).find('svg > path').attr('d') != null) {
        $playPause.click();
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

        //Close Order Panel
        $(orderPanelCloseSelector).click()

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

function clearFields() {
    $(`#${symbolId}`).val("");
    $(`#${priceId}`).val("");
}

function autoAlert(func) {
    //Wait for Add Alert Context Menu Option
    waitJEE(autoAlertSelector, function (el) {
        let regExp = /\((.*)\)/g;
        let match = regExp.exec(el.text());
        let altPrice = parseFloat(match[1])

        //Call Function with Char Alert Price
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
    let input = $(`#${symbolId}`).val();
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
                createAlert(top.pairId, p);
            }

            //Clear Values
            setTimeout(clearFields, 10000);

            //Alert Refresh
            altRefresh();
        });
    }
}

function autoAlertCreate() {
    autoAlert((altPrice) => {
        searchSymbol(getMappedTicker(), function (top) {
            createAlert(top.pairId, altPrice);
            altRefresh();
        });
    })
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

//TODO:Cleanup
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

    if (!orderSet.get(7).has(symb)) {
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
            return a.price - b.price;
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

//Trello Cards
function createCard() {
    let ticker = getTicker();
    let listId = orderSet.get(2).has(ticker) ? "5b0fb8122611996bf3b1eb3b" : "5cfb58544c0c65863097655f";
    let sourceId = $(this).data('id');
    //console.log(this, listId, sourceId)
    createTrelloCard(ticker, sourceId, listId);
}

//Hotkeys: TradingView Toolbar & Style
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 */
function timeframe(timeFrameIndex) {
    $(`${timeframeSelector}:nth-child(${(getTimeFrameIndex(timeFrameIndex))})`).click();
    styleIndex = timeFrameIndex;
}

function getTimeFrameIndex(styleIndex) {
    var styleName = getExchange() === "NSE" ? "NSE" : "DEFAULT";
    styleName = scalpModeOn ? "SCALP" : styleName;
    // console.log(styleName, styleIndex)
    return timeFrameBar[styleName][styleIndex];
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
    style(positions[styleIndex]);
}

/**
 * Clicks Favourite Toolbar on Given Index
 * @param index
 */
function favToolbar(index) {
    $(`div.ui-sortable:nth-child(2) > div:nth-child(${index}) > span:nth-child(1)`).click();
}

/**
 * Clicks Appropriate Index in Dropdown.
 * @param index
 */
function style(index) {
    // Template Selector
    waitClick(styleSelector,()=>{
        //Clicks Style based on Index.
        waitJClick(`${styleItemSelector}(${index})`)
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
        .append(buildInput(symbolId).keypress(onSymbolKeyPress))
        .append(buildInput(priceId).keypress(onPriceKeyPress));

    buildWrapper(altzId).appendTo(`#${areaId}`);
    buildWrapper(ordersId).appendTo(`#${areaId}`);
    buildWrapper(trelloId).hide().appendTo(`#${areaId}`);

    trelloSectionUI();
}

function trelloSectionUI() {
    //Trello Section
    buildWrapper('aman-trello-type').appendTo(`#${trelloId}`)
        .append(buildButton('M-T', "M-T", createCard).data('id', '5e37123b78179482bfbaba7c'))
        .append(buildButton('M-CT', "M-CT", createCard).data('id', '5e371210e096bb0fc7feb409'))
        .append(buildButton('W-T', "W-T", createCard).data('id', '5e3712cfb57c1210b4627055'))
        .append(buildButton('W-CT', "W-CT", createCard).data('id', '5e3712df7f1630869f9d559d'));
}