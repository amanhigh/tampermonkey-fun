var csrf;

function SetupBinanceUI() {
    buildArea(areaId, '65%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton("aman-order", 'Order', PlaceBinanceOrder))
}

function PlaceBinanceOrder() {
    let ticker = $("div.css-iz7azo").text();

    var sl = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(1)').val());
    let entry = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(2)').val());
    var tp = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(4)').val());
    let rr = (sl - entry) / (entry - tp);

    //Inverse Swap to handle Long/Short based on RR.
    if (rr > 1.1) {
        let tmp = sl;
        sl = tp;
        tp = tmp;
    }

    // let uuid = localStorage.getItem("__bnc_uuid");
    // let csrf = localStorage.getItem("__bnc_csrf");
    //console.log(uuid, csrf, ticker, sl, entry, tp,rr);

    let order = new BinanceOrder(ticker, sl, entry, tp);
    // console.log(uuid,csrf,order.stopLoss(),order.entry(),order.takeProfit());
    order.execute();
}

function captureCsrf() {
    XMLHttpRequest.prototype.realSetRequest = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
        if (k === 'csrftoken') {
            if (csrf !== v) {
                csrf = v;
                message('Token Captured'.fontcolor('yellow'));
            }
        }
        this.realSetRequest(k, v);
    };
}