// ==UserScript==
// @name         Binance
// @namespace    aman
// @version      1.0
// @description  Binance the Fast Way
// @author       Amanpreet Singh
// @match        https://www.binance.com/*
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
//UI Coordinates

//-- Are we on the "interactive" page/site/domain or the "monitoring" one?
if (location.pathname.includes("binance")) {
    binance();
}

//***************Binance ********************
function binance() {
    SetupBinanceUI();
}

