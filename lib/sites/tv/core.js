//Inmemory
var freezeSequence;
var filterChain = [];
var timeFrame = TimeFrame.DAILY;

/**
 * In-Memory Store Declarations
 * These variables maintain runtime state and are never persisted to storage
 */

/**
 * Stores alert validation results for investing.com tickers
 * @type {Map<string, AuditResult>}
 * Key: InvestingTicker (e.g., "RELIANCE-NSE")
 * Value: AuditResult { ticker: InvestingTicker, state: AlertState }
 */
var auditMapInMem;

/**
 * Maintains active price alerts indexed by their pair IDs
 * @type {Map<string, Alert>}
 * Key: PairId (e.g., "P123")
 * Value: Alert { Id: string, Price: number, PairId: string }
 */
var alertMapInMem;

/**
 * Provides reverse mapping from investing.com tickers to TradingView tickers
 * Generated from dataSilo.tickerMap for quick reverse lookups
 * @type {Object<string, string>}
 * Key: InvestingTicker (e.g., "HDFC-NSE")
 * Value: TVTicker (e.g., "HDFC")
 */
var reverseTickerMapInMem;

/**
 * Tracks recently accessed TradingView tickers
 * Converted from dataSilo.recentTickers array to Set for efficient lookups
 * @type {Set<string>}
 * Contains: Set of TVTickers (e.g., "HDFC", "TCS")
 */
var recentTickersInMem;

// Silo In Memory Stores
var dataSilo;
// TODO: Add PairMap
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