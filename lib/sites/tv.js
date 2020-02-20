const tickerSelector = 'div.title-bcHj6pEn';
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