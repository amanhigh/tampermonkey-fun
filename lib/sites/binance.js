var csrf;

function SetupBinanceUI() {
    buildArea(areaId, '65%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton("aman-order", 'Order', PlaceBinanceOrder))
}

function PlaceBinanceOrder() {
    let ticker = document.URL.split("/")[5].replace("_","");

    var sl = parseFloat($("iframe").contents().find('input.innerInput-29Ku0bwF:nth(6)').val());
    let entry = parseFloat($("iframe").contents().find('input.innerInput-29Ku0bwF:nth(2)').val());
    var tp = parseFloat($("iframe").contents().find('input.innerInput-29Ku0bwF:nth(4)').val());
    let rr = (sl - entry) / (entry - tp);

    //Inverse Swap to handle Long/Short based on RR.
    if (rr > 1.1) {
        let tmp = sl;
        sl = tp;
        tp = tmp;
    }


    let order = new BinanceOrder(ticker, sl, entry, tp);
    //console.log(csrf, ticker, sl, entry, tp,rr);
    // console.log(csrf,order.stopLoss(),order.entry(),order.takeProfit());
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