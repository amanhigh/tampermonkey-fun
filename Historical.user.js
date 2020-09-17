// ==UserScript==
// @name         Binance
// @namespace    aman
// @version      1.0
// @description  Binance the Fast Way
// @author       Amanpreet Singh
// @match        https://www.investing.com/*historical-data
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/ui.js
// @require      lib/client/binance.js
// @require      lib/sites/binance.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==

function SetupHistoricalUI() {
    buildArea(areaId, '65%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton("aman-historical", 'Download', download))
}

function download() {
    $(".calendarDatePicker").click();
    $('#startDate').val("05/30/2020");
    waitClick('#applyBtn');
    waitClick('.downloadBlueIcon');
}




