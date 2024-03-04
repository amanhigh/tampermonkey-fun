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

// -- Startup

/**
 * Logs the missing FNOs Tickers and their count.
 *
 */
function LogMissingFno() {
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

// -- UI Setup

/**
 * Sets up the fast alert user interface with various UI components and event handlers.
 *
 * @param {type} areaId - the identifier of the area to build the UI in
 * @return {type} undefined
 */
function SetupTvUI() {
    buildArea(areaId, '76%', '6%').appendTo('body');

    buildWrapper(topId).appendTo(`#${areaId}`)
        .append(buildCheckBox(swiftId, false).change(EnableSwiftKey))
        .append(buildButton(gttId, 'G', HandleGttOrderButton))
        .append(buildButton(refreshId, 'R', onRefresh))
        // FIXME: Cleanup all things Trello
        .append(buildButton(journalBtnId, 'J', () => {
            toggleUI(`${journalId}`);
        }))
        .append(buildCheckBox(recentId, false).change(onRecentTickerReset))
        .append(buildWrapper(summaryId));

    buildWrapper(midId).appendTo(`#${areaId}`)
        .append(buildInput(inputId).keypress(HandleInputSubmit))
        .append(buildInput(priceId).keypress(HandlePriceSubmit));

    buildWrapper(altzId).appendTo(`#${areaId}`);
    buildWrapper(ordersId).appendTo(`#${areaId}`);
    buildWrapper(journalId).hide().appendTo(`#${areaId}`);

    journalUI();
}

/**
 * Function for rendering the journal user interface.
 *
 * @return {void} 
 */
function journalUI() {
    buildWrapper(`${journalId}-type`).appendTo(`#${journalId}`)
        .append(buildButton('mwd.trend', "M-T", RecordJournal).data('id', '5e37123b78179482bfbaba7c'))
        .append(buildButton('mwd.ctrend', "M-CT", RecordJournal).data('id', '5e371210e096bb0fc7feb409'))
        // FIXME: Rely on Scalp Mode and Remove Extra Buttons
        .append(buildButton('yr.trend', "Y-T", RecordJournal).data('id', '5e3712cfb57c1210b4627055'))
        .append(buildButton('yr.ctrend', "Y-CT", RecordJournal).data('id', '5e3712df7f1630869f9d559d'));
}