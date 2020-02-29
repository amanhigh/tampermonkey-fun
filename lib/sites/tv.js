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

const colorList = ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'greenyellow', 'brown'];
const indexSymbols = ['CNXMIDCAP', 'CNXSMALLCAP', 'IXIC', 'DXY', 'NIFTY', 'NIFTYJR', 'US10Y', 'USOIL', 'USDINR', 'XAUUSD', 'XAGUSD', 'SHCOMP', 'BTCUSD', 'GOLDSILVER'];

const nameLength = 10;

//Stores
const orderInfoKey = 'orderInfo';
const styleIndexKey = 'styleIndex';

//UI Ids
const areaId = 'aman-area';
const swiftId = 'aman-swift';
const summaryId = 'aman-summary';
const symbolId = 'aman-symbol';
const priceId = 'aman-price';
const gttId = 'aman-gtt';
const altzId = 'aman-altz';

function getName() {
    return $(nameSelector)[0].innerHTML;

}

function getTicker() {
    return $(tickerSelector).val();
}

function readLtp() {
    return parseFloat($(ltpSelector).text());
}

// -- WatchList --
function getWatchListTickers() {
    return $(watchListSymbolSelector).toArray().map(s => s.innerHTML);
}

function getWatchListNames() {
    return $(watchListNameSelector).map((i, e) => e.title.split(',')[0].toLowerCase().substring(0, nameLength)).toArray();
}

// -- ORDER PANEL --
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

function deleteAlertLines() {
    $('#drawing-toolbar-object-tree').click();
    waitEE('.tv-objects-tree-item__title', function () {
        $('.tv-objects-tree-item__title:contains("Horizontal Line")').parent().find('.js-remove-btn').click();
    });
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
 *  Remove from Watch List Last Selected Symbol
 */
function removeFromWatchList() {
    let current = $('div[data-active=true]').parent();
    //Remove Previous Symbol. Incase of Last Symbol Prev is Nil
    current.prev().find('.removeButton-2DU0hPm3').click()
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
    $(watchListSymbolSelector).css('color', 'white');
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

//TradingView: PaintHelpers
function paintTickers(selector) {
    let orders = GM_getValue(orderInfoKey, getDefaultOrders());

    for (let i = 0; i < 5; i++) {
        paint(selector, orders[i] || [], colorList[i]);
    }
}

function paint(selector, symbols, colour) {
    for (const sym of symbols) {
        $(`${selector}:contains("${sym}")`).css('color', colour);
    }
}

// - WatchList Summary
function updateSummary() {
    let msg = ""
    let orders = GM_getValue(orderInfoKey, getDefaultOrders());

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

// -- TV Handlers
/**
 * Records order for given ListNo.
 * @param listNo
 */
function recordOrder(listNo) {
    let ticker = getTicker();

    /* Store Order Info */
    let orders = GM_getValue(orderInfoKey, getDefaultOrders())
    //Create Set if first time, Convert Json array to Set as Json can't store sets.
    let orderSet = new Set(orders[listNo]);
    //Use Set to maintain uniqueness
    orderSet.has(ticker) ? orderSet.delete(ticker) : orderSet.add(ticker);
    //Convert to array before Storing.
    orders[listNo] = Array.from(orderSet);
    console.log(orders);
    GM_setValue(orderInfoKey, orders)

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

//TradingView:: Title Management
/**
 * Changes Title to Signal AHK
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

//Hotkeys: TradingView Toolbar & Style
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 * @param name: MN/WK/DL/HL (Unused)
 * @param styleIndex: Style Index Based on Dropdown List in Styles
 */
function timeframe(timeFrameIndex, name, styleIndex) {
    $(`#header-toolbar-intervals > div:nth-child(${timeFrameIndex})`).click();
    GM_setValue(styleIndexKey, styleIndex);
}

/**
 * Based on Provided Positions Select Appropriate Style
 * @param positions
 */
function timeframeStyle(positions) {
    let tindex = GM_getValue(styleIndexKey);
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

// -- Setup UI
function setupFastAlertUI() {
    buildArea(areaId,'76%','8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildCheckBox(swiftId, false).change(fixTitle))
        .append(buildLabel("", summaryId));

    buildWrapper('aman-mid').appendTo(`#${areaId}`)
        .append(buildInput(symbolId))
        .append(buildInput(priceId).keypress(onPriceKeyPress))

    buildButton(gttId, 'GTT', setGtt).appendTo(`#${areaId}`)
    buildArea(altzId).appendTo(`#${areaId}`);
}