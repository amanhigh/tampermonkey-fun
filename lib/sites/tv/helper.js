// -- Ticker Mappers

/**
 * Resolve Current Ticker to mapping if Available.
 *
 * @return {type} Mapped Ticker
 */
function getMappedTicker() {
    return mapTicker(getTicker());
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