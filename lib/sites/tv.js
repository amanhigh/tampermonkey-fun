const symbolSelector = 'div.title-bcHj6pEn';
const exchangeSelector = '.select-1T7DaJS6';

const screenerSymbolSelector = 'tv-screener__symbol';
const watchListSymbolSelector = 'symbolNameText-2EYOR9jS';
const watchListNameSelector = 'div.symbol-17NLytxZ';

const tickerSelector = '.input-3lfOzLDc';
const nameSelector = ".dl-header-symbol-desc";
const ltpSelector = '.dl-header-price';

const watchListSelector = ".tree-T6PqyYoA";
const screenerSelector = ".tv-data-table";

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