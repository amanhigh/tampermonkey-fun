//Store
const gttMapStore = "gttMap"

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
function createBuy(pair, buy_trg, qty, ltp, exp) {
    let price = generateTick(buy_trg + margin * buy_trg);
    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buy_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

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
function buildGttMap() {
    var m = {}
    waitJEE('.gtt-list-section tr',(e)=>{
        e.each(function () {
            let $this = $(this);
            let status = $this.find("td.status span span").text();
            let sym = $this.find("span.tradingsymbol span").text();
            let qty = $this.find("td.quantity > span:first").text();
            let type = $this.find('td.type > span:first').text();
            let gttId = $(this).attr('data-uid')
            if (status == "ACTIVE") {
                // console.log(sym, type, qty, gttId)
                m[sym] = m[sym] || [];
                return m[sym].push({sym: sym, qty: qty.trim(), type: type.trim(), id: gttId});
            }
        })
        // console.log('GttMap: ', m);
        if (Object.keys(m).length > 0) {
            GM_setValue(gttMapStore, m);
        } else {
            console.log('GttMap Empty Not Storing')
        }
    })
}