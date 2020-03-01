const margin = 0.005;

// FAST GTT
function createOrder(pair, ltp, sl, ent, tp, qty) {
    let d = new Date();
    let year = d.getFullYear() + 1;
    let month = d.getMonth();
    let day = d.getDate();
    let exp = `${year}-${month}-${day} 00:00:00`;
    createBuy(pair, ent, qty, ltp, exp);
    createOco(pair, sl, tp, qty, ltp, exp);

}

// Order Types
function createBuy(pair, price, qty, ltp, exp) {
    let buy_trg = generateTick(price + margin * price);
    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buy_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function createOco(pair, sl_trg, tp, qty, ltp, exp) {
    let sl = generateTick(sl_trg - margin * sl_trg);

    let tp_trg = generateTick(tp - margin * tp);
    let ltp_trg = generateTick(ltp + 0.03 * ltp);

    // Choose LTP Trigger If Price to close to TP.
    if (tp_trg < ltp_trg) {
        tp_trg = ltp_trg;
    }

    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${sl_trg},${tp_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${sl},"order_type":"LIMIT","product":"CNC"},{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${tp},"order_type":"LIMIT","product":"CNC"}]&type=two-leg&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function generateTick(n) {
    return (Math.ceil(n * 20) / 20).toFixed(2)
}

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

function sync(syncData) {
    let listNo = 2;

    //Open List
    $(`.marketwatch-selector li:nth-child(${listNo})`).click();

    //Wait for List to Open
    waitJEE(`.marketwatch-selector li:nth-child(${listNo})`, () => {
        clearList()
    })
}

function clearList() {
    $('div.vddl-draggable').each((i, e) => {
        e.dispatchEvent(new Event('mouseenter'));
        waitClick("span.icon-trash");
        console.log(e);
    })
}
