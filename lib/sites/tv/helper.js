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