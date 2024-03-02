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