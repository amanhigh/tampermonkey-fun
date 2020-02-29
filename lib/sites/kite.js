/**
 * Toggle kiteWatch Symbol.
 * @param listNo
 * @param symbol
 */
function kiteWatchToggleSymbol(listNo, symbol) {
    //Open List
    $(`.marketwatch-selector li:nth-child(${listNo})`).click();

    //Wait for List to Open
    waitJEE(`.marketwatch-selector li:nth-child(${listNo})`, () => {
        /* If Exists Remove */
        let x = $(`span.nice-name:contains('${symbol}')`).parent().parent().parent().parent();
        if (x.length) {
            x[0].dispatchEvent(new Event('mouseenter'));
            waitClick("span.icon-trash");
        } else {
            //Add Symbol if Missing
            waitInput('#search-input', symbol);
            waitClick('.search-result-item');
        }
    })
}