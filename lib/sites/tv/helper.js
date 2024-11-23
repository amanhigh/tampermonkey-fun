// -- Ticker Mappers

/**
 * Resolve Current Ticker to mapping if Available.
 *
 * @return {type} Mapped Ticker
 */
function getMappedTicker() {
    return mapTicker(getTicker());
}

/**
 * Get default sequence based on exchange
 * @param {string} exchange Exchange identifier
 * @returns {string} Default sequence for the exchange
 */
function getDefaultSequence(exchange) {
    return exchange === NSE_EXCHANGE ? DEFAULT_SEQUENCE : HIGH_SEQUENCE;
}

/**
 * A function that maps current ticker to a sequence from the dataSilo, 
 * returning the sequence if found, otherwise returning the DEFAULT_SEQUENCE.
 *
 * @return {type} the mapped sequence or DEFAULT_SEQUENCE if not found
 */
function getSequence() {
    return dataSilo.getSequence(getTicker(), getDefaultSequence(getExchange()));
}


// -- Ticker Pinners
/**
 * Pins a sequence to a TV ticker in the dataSilo object and displays a message.
 *
 * @param {string} tvTicker - The TV ticker to pin the sequence to.
 * @return {void} This function does not return anything.
 */
function pinSequence(tvTicker) {
    // Flip Currently Set Sequence
    let sequence = getSequence() === HIGH_SEQUENCE ? DEFAULT_SEQUENCE : HIGH_SEQUENCE;
    dataSilo.pinSequence(tvTicker, sequence);
}

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

// -- FastAlert Readers
/**
 * Retrieves the time frame object for a given time frame index.
 *
 * @param {number} timeFrameIndex - The index of the time frame (0-3)
 * @return {Object} The time frame object containing properties like index, style, and name
 */
function getTimeFrame(timeFrameIndex) {
    // Get current sequence if not frozen
    var sequence = freezeSequence || getSequence();
    return timeFrameBar[sequence][timeFrameIndex];
}