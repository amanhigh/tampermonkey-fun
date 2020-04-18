function SetupBinanceUI() {
    buildArea(areaId, '76%', '6%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton(gttId, 'Order', PlaceBinanceOrder))
}

function PlaceBinanceOrder() {
    let ticker = $("div.sc-AxjAm:nth(5)").text()
    let sl = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(1)').val());
    let entry = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(2)').val());
    let tp = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(4)').val());
    let uuid = localStorage.getItem("__bnc_uuid");
    let csrf = localStorage.getItem("__bnc_csrf");

    console.log(uuid, csrf, ticker, sl, entry, tp);
}