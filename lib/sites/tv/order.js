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

// Summary -- Display

/**
 * Display Count of Various Sets.
 *
 */
function displaySetSummary() {

    $watchSummary = $(`#${summaryId}`);
    $watchSummary.empty();

    /**
     * Adds Count to Watch Summary
     * @param indexCount
     * @param colorIndex
     */
    function addCount(indexCount, colorIndex) {
        buildLabel(indexCount.toString() + '|', colorList[colorIndex]).data('color', colorList[colorIndex]).appendTo($watchSummary)
            .mousedown((e) => {
                FilterWatchList({
                    color: $(e.target).data('color'),
                    index: e.which,
                    ctrl: e.originalEvent.ctrlKey,
                    shift: e.originalEvent.shiftKey
                });
            }).contextmenu(e => {
                e.preventDefault();
                e.stopPropagation();
            });
    }

    for (let i = 0; i < colorList.length; i++) {
        addCount(orderSet.get(i).size, i);
    }
}

/**
 * Generates a summary of the GTT orders for a given ticker
 * in Info Area.
 *
 * @param {GttOrderMap} gttOrderMap - The object containing the GTT orders.
 * @return {undefined} This function does not return a value.
 */
function gttSummary(gttOrderMap) {
    const currentTicker = getTicker();
    const ordersForTicker = gttOrderMap.getOrdersForTicker(currentTicker);
    const $ordersContainer = $(`#${ordersId}`);
    //Clear Old Orders
    $ordersContainer.empty();

    //If Orders Found for this Ticker
    if (ordersForTicker.length > 0) {
        //Add GTT Buttons
        ordersForTicker.reverse().forEach((order) => {
            const orderTypeShort = order.type.includes('single') ? "B" : "SL";
            //Extract Buy Price for Single order and Target for Two Legged
            const triggerPrice = order.type.includes('single') ? order.prices[0] : order.prices[1];
            const lastTradedPrice = getLastTradedPrice();
            // Compute percent Difference from trigger price to LTP
            const priceDifferencePercent = Math.abs(triggerPrice - lastTradedPrice) / lastTradedPrice;
            // Color Code far Trigger to yellow (if difference is more than 20%)
            const buttonColor = priceDifferencePercent > 0.20 ? 'yellow' : 'lime';
            buildButton("", `${orderTypeShort}-${order.qty} (${triggerPrice})`.fontcolor(buttonColor), HandleDeleteOrderButton)
                .data('order-id', order.id)
                .appendTo($ordersContainer);
        });
    }
}


// Order -- Create

/**
 * Handle the GTT order button click event.
 *
 * @param None
 * @return None
 */
function HandleGttOrderButton() {
    //Read Symbol from TradingView, Order Panel.
    let order = readOrderPanel();
    //Fix Ticker to Match Broker Platform
    order.symb = getTicker();
    order.ltp = getLastTradedPrice();

    //console.log(`GTT ${qty}- ${sl} - ${ent} - ${tp}`);

    //Build Order and Display
    message(`${order.symb} (${order.ltp}), Qty ${order.qty}, SL:ENT:TP: ${order.sl} - ${order.ent} - ${order.tp}`, 'yellow');

    //If Valid Order Send else Alert
    if (order.qty > 0 && order.sl > 0 && order.ent > 0 && order.tp > 0) {
        //Send Signal to Kite to place Order.
        GM_setValue(gttRequest, order);
        //Close Order Panel
        $(orderPanelCloseSelector).click()
    } else {
        alert("Invalid GTT Input");
    }
}

/**
 * Reads the order panel and retrieves the quantity, stop loss, entry, and take profit values.
 *
 * @return {Object} An object containing the quantity, stop loss, entry, and take profit values
 */
function readOrderPanel() {
    let ent = parseFloat($('input[data-property-id="Risk/RewardlongEntryPrice"]').val());
    let tp = parseFloat($('input[data-property-id="Risk/RewardlongProfitLevelPrice"]').val());
    let sl = parseFloat($('input[data-property-id="Risk/RewardlongStopLevelPrice"]').val());

    // Round Risk
    let risk = (ent - sl).toFixed(2);
    let qty = Math.round(orderRiskLimit / risk);
    let doubleQty = Math.round((orderRiskLimit * 2) / risk);
    // Confirm Qty
    qty = prompt(`Qty (2X): ${qty} (${doubleQty}) RiskLimit: ${orderRiskLimit} TradeRisk: ${risk}`, qty);
    return { qty, sl, ent, tp };
}


// Order -- Delete

/**
 * Handles the click event of the delete order button.
 *
 * @param {Event} evt - The event object
 * @return {undefined} No return value
 */
function HandleDeleteOrderButton(evt) {
    let $target = $(evt.currentTarget);
    let id = $target.data('order-id');

    message(`GTT Delete: ${id}`, 'red');

    //Send Signal to Kite delete  Order with only id
    GM_setValue(gttRequest, { id: id });
}

// Order - Journal

/**
 * RecordJournal function records the journal entry based on the timeframe and reason provided.
 * It gets the timeframe from the button clicked, prompts the user for the reason,
 * determines the type of entry based on the ticker and order set, and then copies the entry to the clipboard.
 *
 * @return {undefined} This function does not return a value
 */
function RecordJournal() {
    //Get Timeframe from Button
    let timeframe = getSequence().toLowerCase() + "." + this.id;

    ReasonPrompt(function (reason) {
        //Get Ticker
        let ticker = getTicker();

        //Not Taken Settings
        let type = "rejected";

        if (orderSet.get(2).has(ticker)) {
            //Taken Settings
            type = "set"
        } else if (orderSet.get(0).has(ticker) || orderSet.get(1).has(ticker) || orderSet.get(4).has(ticker)) {
            type = "result"
        }

        // Augment Reason
        if (reason !== "" && reason !== 'Cancel') {
            type = type + "." + reason
        }

        let tag = ticker + "." + timeframe + "." + type;

        //Put All in Journal with Type
        RecordTicker(tag);
    })
}
