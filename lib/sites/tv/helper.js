// -- Ticker Mappers

/**
 * Resolve Current Ticker to mapping if Available.
 *
 * @return {type} Mapped Ticker
 */
function getMappedTicker() {
    return mapTicker(getTicker());
}

// -- Ticker Pinners
/**
 * Process Action with Value.
 */
function processTextAction() {
    const tvTicker = getTicker();
    const input = $(`#${displayId}`).val();
    const exchange = getExchange();

    if (!input) return;

    const [action, value] = input.split('=');

    if (!action || !value) {
        displayHelpMessage();
        return;
    }

    const actionHandlers = {
        E: () => pinExchangeTicker(tvTicker, exchange)
    };

    const handler = actionHandlers[action];
    if (handler) {
        handler();
    } else {
        displayHelpMessage();
    }

    clearFields();
}

function displayHelpMessage() {
    const help = `
    PinExchange: E=NSE(Auto Picks Current Exchange)<br/>
    `;
    message(`Invalid Map Format. ${help}`, "red");
}

// -- Support Functions

function displaySequence() {
    let sequence = getSequence();
    let message = getTicker() + ':' + sequence;
    $(`#${displayId}`).val(message);
    // Background Color Blue
    if (sequence === HIGH_SEQUENCE) {
        $(`#${displayId}`).css("background-color", "maroon");
    } else {
        $(`#${displayId}`).css("background-color", "black");
    }
}

/**
 * Clears the input fields.
 *
 * @return {void} 
 */
function clearFields() {
    $(`#${displayId}`).val("");
    $(`#${inputId}`).val("");
}

// -- Data Loaders/Storeres

function loadTradingViewVars() {
    orderSet = new OrderSet();
    flagSet = new FlagSet();
    dataSilo = DataSilo.load();
    pairSilo = PairSilo.load();
    alertMemStore = AlertMemStore.load();
    //Enable/Disable Recent based on weather previous state had recent Tickers
    $(`#${recentId}`).prop('checked', dataSilo.getRecentTickerCount() > 0)
}