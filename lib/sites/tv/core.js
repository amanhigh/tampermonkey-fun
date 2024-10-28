//Inmemory
var freezeSequence;
var filterChain = [];
var timeFrame = TimeFrame.DAILY;

// In Memory Stores
var alertMemStore;

// Saved Silo
var dataSilo;
var pairSilo;
var orderSet;
var flagSet;


//Replay
var replayCron = false;
var runReplay = false;

// -- Startup

function LogMissingData() {
    // TODO: Add Data Silo Coherency Check
    LogMissingFno();
}

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
        .append(buildButton(seqId, 'S', HandleSequenceSwitch))
        .append(buildButton(refreshBtnId, 'R', HandleRefreshButton))
        .append(buildButton(altCreateBtnId, 'A', HandleAlertButton))
        .append(buildButton(journalBtnId, 'J', HandleJournalButton))
        .append(buildCheckBox(recentId, false).change(onRecentTickerReset))
        .append(buildWrapper(summaryId));

    buildWrapper(midId).appendTo(`#${areaId}`)
        .append(buildInput(displayId).keypress(HandleInputSubmit))
        .append(buildInput(inputId).keypress(HandlePriceSubmit));

    // Right Click Handler
    $(`#${altCreateBtnId}`).on('contextmenu', HandleAlertContextMenu);

    buildWrapper(alertsId).appendTo(`#${areaId}`);
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
        .append(buildButton('trend', "TR", RecordJournal))
        .append(buildButton('ctrend', "CT", RecordJournal))

    buildWrapper(auditId).appendTo(`#${journalId}`);
}