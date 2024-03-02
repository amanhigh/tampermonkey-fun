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