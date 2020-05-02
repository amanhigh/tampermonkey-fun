const margin = 0.03;
const maxRisk = 1;

class BinanceOrder {
    baseOrder = {
        "timeInForce": "GTC",
        "leverage": 10,
        "timestamp": 0
    };

    prices;

    constructor(symbol, sl, entry, tp) {
        this.baseOrder.symbol = symbol;
        this.prices = {sl: sl, entry: entry, tp: tp};
        this.baseOrder.quantity = this.getQuantity(sl, entry);
    }

    entry() {
        let order = Object.assign({}, this.baseOrder);
        order.type = "LIMIT"
        order.price = this.prices.entry;
        order.side = this.getSide();
        order.reduceOnly = false;
        return order;
    }

    takeProfit() {
        let order = Object.assign({}, this.baseOrder);
        order.type = "TAKE_PROFIT";
        order.stopPrice = this.prices.tp;

        return this.stopLimitOrder(order);
    }

    stopLoss() {
        let order = Object.assign({}, this.baseOrder);
        order.type = "STOP";
        order.stopPrice = this.prices.sl;

        return this.stopLimitOrder(order);
    }

    stopLimitOrder(order) {
        order.side = this.getSide(true);
        order.price = this.getBufferedPrice(order.stopPrice);
        order.workingType = "CONTRACT_PRICE";
        order.reduceOnly = true;
        return order;
    }

    getSide(flip = false) {
        if (this.prices.sl < this.prices.entry) {
            return flip ? "SELL" : "BUY";
        } else {
            return flip ? "BUY" : "SELL";
        }
    }

    getQuantity(sl, entry) {
        let safeSl = this.getBufferedPrice(sl);
        let risk = Math.abs(entry - safeSl);
        return (maxRisk / risk).toFixed(3);
    }

    getBufferedPrice(price) {
        var bufferedPrice
        if (this.getSide() === "BUY") {
            bufferedPrice = price - (price * margin);
        } else {
            bufferedPrice = price + (price * margin);
        }
        return bufferedPrice.toFixed(5);
    }

    execute() {
        //Confirm Quantity
        let sl = this.stopLoss();
        let tp = this.takeProfit();
        let ent = this.entry();

        let approvedQuantity = prompt(`Symbol: ${this.baseOrder.symbol} Side: ${ent.side}\n
        SL: ${sl.price}/${sl.stopPrice} | ENT: ${ent.price} | TP: ${tp.price}/${tp.stopPrice} \n
        Please confirm Quantity`, this.baseOrder.quantity);

        if (approvedQuantity != null) {
            //Override Quantity with Confirmed One
            for (let order of [sl, tp, ent]) {
                order.quantity = approvedQuantity;
                placeBinanceOrder(order);
            }
        }
    }

    static toString(order) {
        return `Side:${order.side}/${order.type} - Stop:${order.stopPrice}/${order.reduceOnly}`;
        //console.log(order);
    }
}

function placeBinanceOrder(order) {
    // console.log(JSON.stringify(order));
    GM.xmlHttpRequest({
        headers: {
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "clienttype": "web",
            "Content-Type": "application/json",
            "lang": "en",
            "csrftoken": csrf,
            "bnc-uuid": localStorage.getItem("__bnc_uuid")
        },
        url: "https://www.binance.com/gateway-api/v1/private/future/order/place-order",
        method: "POST",
        mode: "CORS",
        referrer: "https://www.binance.com/en/futures/" + order.symbol,
        data: JSON.stringify(order),
        onload: function (response) {
            if (response.status == 200) {
                message('Order Successful'.fontcolor('green'))
                message(BinanceOrder.toString(order).fontcolor('yellow'))
            } else {
                message('Order Failed'.fontcolor('red'))
                console.log(response)
            }
        },
        onerror: function () {
            message("Binance: Error Placing Order".fontcolor('red'));
        }
    });
}