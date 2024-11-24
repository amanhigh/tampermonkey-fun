// Set -- Management

/**
 * Records order for given ListNo.
 * @param listNo
 */
function RecordList(listNo) {
    recordSet(orderSet, listNo);
}

/**
 * RecordFlag function records a flag for the specified list number.
 *
 * @param {type} listNo - the list number to record the flag for
 * @return {type} undefined
 */
function RecordFlag(listNo) {
    recordSet(flagSet, listNo);
}

/**
 * Records the set for a given list number.
 *
 * @param {Object} set - The set to be recorded
 * @param {number} listNo - The list number
 * @return {void}
 */
function recordSet(set, listNo) {
    let selected = getTickersSelected();

    //Toggle (Add/Remove) Selected Items in Set.
    selected.forEach((s) => set.toggle(listNo, s));

    //Save
    set.save();

    //Re-Render
    onWatchListChange();
}

/**
 *  Saves Watch List and Composite Tickers
 *  to Order Set.
 */
function updateWatchListSet() {
    //Parse Watch List
    let watchListTickers = getTickersWatchList();

    //Prep Watchlist Set with all Symbols not in other Order Sets
    let watchSet = new Set(watchListTickers);
    for (let i = 0; i < colorList.length; i++) {
        if (i !== 5) {
            orderSet.get(i).forEach(v => watchSet.delete(v));
        }
    }
    orderSet.set(5, watchSet);

    //Save Order Set
    orderSet.save();
}