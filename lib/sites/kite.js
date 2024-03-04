const margin = 0.005;

const kiteSymbolMap = {
    "M_M": "M&M",
    "M_MFIN": "M&MFIN",
}

//*************** KITE *********************
function kite() {
    //Listen for GTT Orders
    GM_addValueChangeListener(
        gttRequest, (keyName, oldValue, newValue) => {
            //console.log (`Received new GTT Order: ${newValue}`);
            if (newValue.qty > 0) {
                createOrder(newValue.symb, newValue.ltp, newValue.sl, newValue.ent, newValue.tp, newValue.qty)
            } else if (newValue.id) {
                //Qty: Request has Id Signal for Delete GTT
                deleteGtt(newValue.id);
            }
        });

    //Load GttMap && Add Listner on GTT Tab Refresh
    waitJEE('.router-link-exact-active', ($e) => {
        //Timeout required for Table To Render after Tab Click
        $e.click(() => setTimeout(buildGttMap, 1000));
    })
}

// FAST GTT

/**
 * Creates an order with the given parameters.
 * 
 * @param {string} symbol - The symbol of the order.
 * @param {number} ltp - The last traded price of the order.
 * @param {number} sl - The stop loss of the order.
 * @param {number} ent - The entry price of the order.
 * @param {number} tp - The take profit of the order.
 * @param {number} qty - The quantity of the order.
 */
function createOrder(symbol, ltp, sl, ent, tp, qty) {
    let d = new Date();
    let year = d.getFullYear() + 1;
    let month = d.getMonth();
    let day = d.getDate();
    let exp = `${year}-${month}-${day} 00:00:00`;
    //Encode Symbol to handle Special Characters. Eg. M&M, M&MFIN
    let pair = encodeURIComponent(mapKiteSymbol(symbol, false));
    createBuy(pair, ent, qty, ltp, exp);
    createOco(pair, sl, tp, qty, ltp, exp);

}

// Order Types

/**
 * Creates a buy order based on the provided parameters.
 *
 * @param {string} pair - The trading symbol pair.
 * @param {number} buy_trg - The buy trigger value.
 * @param {number} qty - The quantity to buy.
 * @param {number} ltp - The last traded price.
 * @param {string} exp - The expiration time of the order.
 */
function createBuy(pair, buy_trg, qty, ltp, exp) {
    let price = generateTick(buy_trg + margin * buy_trg);
    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buy_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

/**
 * Creates two legged One Cancels Other Orders.
 *
 * @param {string} pair - Trading symbol pair.
 * @param {number} sl_trg - the stopless trigger parameter.
 * @param {number} tp_trg - the target trigger parameter.
 * @param {number} qty - Quantity to buy.
 * @param {number} ltp - Last traded price.
 * @param {any} exp - Expiration time of the order.
 */
function createOco(pair, sl_trg, tp_trg, qty, ltp, exp) {
    let ltp_trg = generateTick(ltp + 0.03 * ltp);
    // Choose LTP Trigger If Price to close to TP.
    tp_trg = tp_trg < ltp_trg ? ltp_trg : tp_trg;

    let sl = generateTick(sl_trg - margin * sl_trg);
    let tp = generateTick(tp_trg - margin * tp_trg);

    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${sl_trg},${tp_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${sl},"order_type":"LIMIT","product":"CNC"},{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${tp},"order_type":"LIMIT","product":"CNC"}]&type=two-leg&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function generateTick(n) {
    return (Math.ceil(n * 20) / 20).toFixed(2)
}

// GTT Map
function buildGttMap(gttResponse) {
    loadGTT(saveMap);
}

/**
 * Generates a map of GTT (Good Till Triggered) orders based on the response from the GTT API.
 * Generates GTT Order Event in GM Cache.
 *
 * @param {Object} gttResponse - The response object from the GTT API.
 * @return {void} - This function does not return anything.
 */
function saveMap(gttResponse) {
    var m = {}
    gttResponse.data.forEach((gtt) => {
        let gttId = gtt.id;
        let status = gtt.status;
        let sym = mapKiteSymbol(gtt.orders[0].tradingsymbol, true);
        let qty = gtt.orders[0].quantity;
        let type = gtt.type;
        let prices = gtt.condition.trigger_values;
        if (gtt.status === "active") {
            // console.log(sym, type, qty, prices, gttId)
            m[sym] = m[sym] || [];
            return m[sym].push({ sym: sym, qty: qty, type: type, id: gttId, prices: prices });
        }
    })
    // console.log('GttMap: ', m);
    let length = Object.keys(m).length;
    if (length > 0) {
        GM_setValue(gttOrderEvent, m);
        message(`GTT Map Built. Count: ${length}`.fontcolor('green'))
    } else {
        message('GttMap Empty Not Storing'.fontcolor('red'))
    }
}

/**
 * Maps a Kite symbol to a TV symbol.
 *
 * @param {string} symbol - The Kite symbol to map.
 * @param {boolean} [reverse=false] - Whether to reverse the mapping.
 * @return {string} - The mapped TV symbol.
 */
function mapKiteSymbol(symbol, reverse = false) {
    let symbolMap = kiteSymbolMap;
    //Reverse to Map Kite Symbol to TV Symbol
    if (reverse) {
        symbolMap = reverseMap(kiteSymbolMap);
    }
    return symbolMap[symbol] || symbol;
}