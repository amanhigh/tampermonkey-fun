// Order Handling
/**
 * Records order for given ListNo.
 * @param listNo
 */
function recordOrder(listNo) {
    recordSet(orderSet, listNo);
}

function recordFlag(listNo) {
    recordSet(flagSet, listNo);
}

function recordSet(set, listNo) {
    let selected = getSelection();

    //Toggle Selected Items
    selected.forEach((s) => set.toggle(listNo, s));

    //Save
    set.save();

    //Re-Render
    onWatchListChange();
}

function watchSummary() {

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
                filterWatchList({
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

//Fast GTT
function setGtt() {
    //Read Symbol from TradingView, Order Panel.
    let order = readOrderPanel();
    //Fix Ticker to Match Broker Platform
    order.symb = getTicker();
    order.ltp = readLastTradedPrice();

    //Get Symbol from Input if Given
    let input = $(`#${inputId}`).val();
    if (input)
        order.symb = input

    //Close Order Panel
    $(orderPanelCloseSelector).click()

    //console.log(`GTT ${qty}- ${sl} - ${ent} - ${tp}`);

    //Build Order and Display
    message(`${order.symb} (${order.ltp}) Qty: ${order.qty}, ${order.sl} - ${order.ent} - ${order.tp}`.fontcolor('yellow'));

    //If Valid Order Send else Alert
    if (order.qty > 0 && order.sl > 0 && order.ent > 0 && order.tp > 0) {
        //Send Signal to Kite to place Order.
        GM_setValue(gttRequest, order);
    } else {
        alert("Invalid GTT Input");
    }
}

function onDeleteGtt(evt) {
    let $target = $(evt.currentTarget);
    let id = $target.data('order-id');

    message(`GTT Delete: ${id}`.fontcolor('red'));

    //Send Signal to Kite delete  Order with only id
    GM_setValue(gttRequest, { id: id });
}

/**
 * Generates a summary of the GTT orders for a given ticker
 * in Info Area.
 *
 * @param {object} m - The object containing the GTT orders.
 * @return {undefined} This function does not return a value.
 */
function gttSummary(m) {
    let orders = m[getTicker()];
    let $orders = $(`#${ordersId}`);
    //Clear Old Orders
    $orders.empty();

    //If Orders Found for this Ticker
    if (orders) {
        //Add GTT Buttons
        orders.reverse().forEach((order) => {
            let shortType = order.type.includes('single') ? "B" : "SL";
            //Extract Buy Price for Single order and Target for Two Legged
            let price = order.type.includes('single') ? order.prices[0] : order.prices[1];
            let ltp = readLastTradedPrice();
            // Compute percent Difference from trigger price to LTP
            let percent = Math.abs(price - ltp) / ltp;
            // console.log(order.type, price, ltp, percent);
            // Color Code far Trigger to red
            let color = percent > 2 ? 'yellow' : 'lime';
            buildButton("", `${shortType}-${order.qty} (${price})`.fontcolor(color), onDeleteGtt).data('order-id', order.id).appendTo($orders);
        })
    }
}

// OrderPanel
function readOrderPanel() {
    let qty = parseFloat($(orderQtySelector).val());
    let sl = parseFloat($(orderInputSelector + ':nth(4)').val());
    let ent = parseFloat($(orderInputSelector + ':nth(0)').val());
    let tp = parseFloat($(orderInputSelector + ':nth(2)').val());
    return { qty, sl, ent, tp };
}

//Trello Cards
function createCard() {
    //Get Timeframe from Button
    let timeframe = this.id;

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
        } else {
            if (reason) {
                type = type + "." + reason
            }
        }

        //Put All in Journal with Type
        ClipboardCopy(ticker + "." + timeframe + "." + type);
    })
}
