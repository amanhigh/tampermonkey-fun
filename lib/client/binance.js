const margin = 0.03;

class BinanceOrder {
    baseOrder = {
        "timeInForce": "GTC",
        "leverage": 10,
        "workingType": "CONTRACT_PRICE",
        "timestamp": 0,
    };

    prices;

    constructor(symbol, qty, sl, entry, tp) {
        this.baseOrder.symbol = symbol;
        this.baseOrder.quantity = qty;
        this.prices = {sl: sl, entry: entry, tp: tp};
    }

    entry() {
        let order = Object.assign({}, this.baseOrder);
        order.type = "LIMIT"
        order.price = this.prices.entry;
        order.side = this.getSide();
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
        order.reduceOnly = true;
        return order
    }

    getSide(flip = false) {
        if (this.prices.sl < this.prices.entry) {
            return flip ? "SELL" : "BUY";
        } else {
            return flip ? "BUY" : "SELL";
        }
    }

    getBufferedPrice(price) {
        if (this.getSide() === "BUY") {
            return price - (price * margin);
        } else {
            return price + (price * margin);
        }
    }
}

function order() {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "clienttype": "web",
            "Content-Type": "application/json",
            "lang": "en",
        },
        url: "https://www.binance.com/gateway-api/v1/private/future/order/place-order",
        method: "POST",
        mode: "CORS",
        referrer: "https://www.binance.com/en/futures/LINKUSDT",
        data: "{\"symbol\":\"LINKUSDT\",\"side\":\"BUY\",\"type\":\"TAKE_PROFIT\",\"timeInForce\":\"GTC\",\"quantity\":1,\"price\":2.61,\"timestamp\":0,\"stopPrice\":2.605,\"reduceOnly\":true,\"workingType\":\"CONTRACT_PRICE\",\"leverage\":10}",
        onload: function (response) {
            console.log(response)
        },
        onerror: function () {
            alert("Binance Error");
        }
    });
}