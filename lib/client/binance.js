class BinanceOrder {
    baseOrder = {
        "timeInForce": "GTC",
        "leverage": 10,
        "workingType": "CONTRACT_PRICE",
        "timestamp": 0,
    }

    prices;
    constructor(symbol, qty, sl, entry, tp) {
        this.baseOrder.symbol = symbol;
        this.baseOrder.quantity = qty;
        this.prices = {sl: sl, entry: entry, tp: tp};
    }

    buildEntry() {
        let order = this.baseOrder.clone();
        order.type = "LIMIT"
        order.price = prices.entry;
        order.side = this.getSide();
    }

    buildTakeProfit(price) {
        let order = this.baseOrder.clone();
        order.side = this.getSide(true);
        order.type = "TAKE_PROFIT";
        order.price = price + 0.01; // TODO: Fix
        order.stopPrice = price;
        order.reduceOnly = true;
    }

    buildStopLoss(price) {
        let order = this.baseOrder.clone();
        order.side = this.getSide(true);
        order.type = "STOP";
        order.price = price + 0.01; // TODO: Fix
        order.stopPrice = price;
        order.reduceOnly = true;
    }

    getSide(flip = false) {
        if (this.prices.sl < this.prices.entry) {
            return flip ? "SELL" : "BUY";
        } else {
            return flip ? "BUY" : "SELL";
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