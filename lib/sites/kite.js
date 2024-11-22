const margin = 0.005;

// Selector
const gttSelector = '.router-link-exact-active';

//*************** KITE *********************

function kite() {
    //Listen for GTT Orders
    GM_addValueChangeListener(gttRequest, (keyName, oldValue, newValue) => {
        //console.log (`Received new GTT Order: ${newValue}`);
        handleGttRequestEvent(newValue);
    });

    //Load GttMap && Add Listner on GTT Tab Refresh
    waitJEE(gttSelector, ($e) => {
        //Timeout required for Table To Render after Tab Click
        $e.click(() => setTimeout(handleGttMapRefreshClick, 1000));
    })
}


// -- Handlers

/**
 * Handle the click event for refreshing the GTT map.
 *
 * @param {gttResponse} gttResponse - the response from GTT
 * @return {void} 
 */
function handleGttMapRefreshClick(gttResponse) {
    loadGTT(saveMap);
}

/**
 * Handle GTT request event and take action based on the input value.
 *
 * @param {Object} gttRequest - The new value to be processed
 */
function handleGttRequestEvent(gttRequest) {
    if (gttRequest.qty > 0) {
        createOrder(gttRequest.symb, gttRequest.ltp, gttRequest.sl, gttRequest.ent, gttRequest.tp, gttRequest.qty);
    } else if (gttRequest.id) {
        //Qty: Request has Id Signal for Delete GTT
        deleteGtt(gttRequest.id);
    }
}

// Order -- GTT Map

/**
 * Generates a map of GTT (Good Till Triggered) orders based on the response from the GTT API.
 * Generates GTT Order Event in GM Cache.
 *
 * @param {Object} gttResponse - The response object from the GTT API.
 * @return {void} - This function does not return anything.
 */
function saveMap(gttResponse) {
    let gttOrder = new GttOrderMap();

    gttResponse.data.forEach((gtt) => {
        if (gtt.status === "active") {
            let sym = mapKiteSymbol(gtt.orders[0].tradingsymbol, true);
            let order = new Order(
                sym,
                gtt.orders[0].quantity,
                gtt.type,
                gtt.id,
                gtt.condition.trigger_values
            );
            gttOrder.addOrder(sym, order);
        }
    });

    let length = gttOrder.getCount();
    if (length > 0) {
        GM_setValue(gttOrderEvent, gttOrder);
        message(`GTT Map Built. Count: ${length}`, 'green');
    } else {
        message('GttMap Empty Not Storing', 'red');
    }
}