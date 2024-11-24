// -- Actions
/**
 * Moves ahead or back based on Step size in Visible Tickers.
 * Uses screener tickers if visible or falls back to Watch list.
 * @param step Number of steps to move
 */
function NavigateTickers(step) {
    //Next visible in Tickers
    let visibleTickers = isScreenerVisible() ? getTickersScreener(true) : getTickersWatchList(true);
    let index = visibleTickers.indexOf(getTicker());
    let nextIndex = index + step;
    if (nextIndex < 0) {
        // Move to last element
        nextIndex = visibleTickers.length - 1
    } else if (nextIndex === visibleTickers.length) {
        //Move to First element
        nextIndex = 0;
    }
    console.log(visibleTickers[nextIndex], index, nextIndex);
    OpenTicker(visibleTickers[nextIndex]);
}

/**
 * Paints Name in Top Section if in WatchList
 */
function paintName() {
    let ticker = getTicker();
    $name = $(nameSelector);

    //Reset Name Color
    $name.css('color', colorList[5]);

    //Find and Paint if found in Watchlist
    for (let i = 0; i < colorList.length; i++) {
        //Highlight Non White if in Watchlist or Color respectively
        let color = i === 5 ? colorList[6] : colorList[i];
        if (orderSet.get(i).has(ticker)) {
            $name.css('color', color);
        }
    }

    //FNO Marking
    if (fnoSymbols.has(ticker)) {
        $name.css(fnoCss);
    } else {
        $name.css('border-top-style', '');
        $name.css('border-width', '');
    }

    //Flag Marking
    let $flag = $(flagMarkingSelector);
    $flag.css('color', colorList[5]);
    $(exchangeSelector).css('color', colorList[5]);
    colorList.forEach((c, i) => {
        if (flagSet.get(i).has(ticker)) {
            $flag.css('color', c)
            $(exchangeSelector).css('color', c);
        }
    })
}