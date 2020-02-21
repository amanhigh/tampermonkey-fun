// ==UserScript==
// @name         SwiftKeys
// @namespace    aman
// @version      1.0
// @description  Hotkeys for Swift Working
// @author       Amanpreet Singh
// @match        http://www.example.net/
// @match        https://in.tradingview.com/chart/*
// @match        https://kite.zerodha.com/*
// @grant        GM_listValues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/sites/tv.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-idle
// ==/UserScript==

const lineMenu = [6, 3, 4, 5];
const demandMenu = [10, 4, 6, 8];
const supplyMenu = [11, 5, 7, 9];

const kiteWatchToggleKey = 'kiteWatchAdd';
const styleIndexKey = 'styleIndex';

if (location.host.includes("tradingview")) {
    tradingView();
} else {
    kite();
}

// ---------------------------------- KITE --------------------------------------------------------
function kite() {
    GM_addValueChangeListener(
        kiteWatchToggleKey, (watchListKey, oldValue, newValue) => {
            //console.log (`WatchListAdd Event: ${newValue}`);
            kiteWatchToggleSymbol(newValue[0], newValue[1]);
        });
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

// -------------------------------- TradingView ---------------------------------------------------------
function tradingView() {
    /* SwiftKey Enabled Indication */
    var enabled = document.createElement("input");
    enabled.id = 'enabled'
    enabled.setAttribute('type', 'checkbox');
    enabled.setAttribute("style", "font-size:" + 24 + "px;position:absolute;top:" + 50 + "px;right:" + 580 + "px;");
    enabled.addEventListener('change', fixTitle)

    document.body.appendChild(enabled);
    document.addEventListener('keydown', doc_keyDown, false);

    //Wait for Title to Load and Fix to Signal Auto Hotkey
    waitEE("title", (el) => {
        //console.log('Observing Title: ' + el.innerHTML);
        attributeObserver(el, fixTitle);
    });
}

//TradingView:: Title Management
/**
 * Changes Title to Signal AHK
 */
function fixTitle() {
    let liner = ' - SwiftKeys';
    //console.log('Processing Title: ' + document.title);
    //SwiftKey On and No Title Add It.
    if (enabled.checked && !document.title.includes('SwiftKeys')) {
        document.title = document.title + liner;
    } else if (!enabled.checked && document.title.includes('SwiftKeys')) {
        // SwiftKey Off and Title present, Remove It.
        document.title = document.title.replace(liner, '');
    }
}

function toggleSwiftKeys(checked) {
    enabled.checked = checked;
    if (checked) {
        message('ENABLED'.fontcolor('green'));
    } else {
        message('DISABLED'.fontcolor('red'));
    }
    fixTitle();
}

//TradingView:: KeyHandlers
function doc_keyDown(e) {
    //console.log(e);
    //alert(`S Pressed: ${e.altKey} | ${e.ctrlKey} | ${e.shiftKey}`);

    if (isModifierKey(e.ctrlKey, 'b', e)) {
        // Toggle SwiftKeys
        toggleSwiftKeys(!enabled.checked);
    }

    if (isModifierKey(e.ctrlKey, 'e', e)) {
        // Toggle Exchange
        toggleExchange();
    }

    if (isModifierKey(e.shiftKey, 'enter', e)) {
        // Textbox Ok
        $('.appearance-default-dMjF_2Hu-').click();

        // Toggle SwiftKeys
        toggleSwiftKeys(true);
    }


    if (enabled.checked === true) {
        if (isModifierKey(e.shiftKey, 'o', e)) {
            // Flag/Unflag
            $('.uiMarker__small-1LSfKnWQ').click();
        } else if (isModifierKey(e.shiftKey, 'q', e)) {
            // Nifty Correlation
            waitEE('div.item-3eXPhOmy:nth-child(5) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)', (e) => {
                e.dispatchEvent(new Event('touchend', {'bubbles': true}));
            })
        } else if (isModifierKey(e.ctrlKey, 'e', e)) {
            // Long Position
            toolbar(7);
        } else {
            nonModifierKey(e);
        }
    }
}

function nonModifierKey(e) {
    //Ignore Numpad Keys
    if (e.keyCode >= 96 && e.keyCode <= 110) {
        return;
    }

    let fired = true;
    switch (e.key) {

        //Toolbar
        case ',':
            //TrendLine
            toolbar(2);
            timeframeStyle(lineMenu);
            break;
        case 'e':
            //FibZone
            toolbar(3);
            break;
        case '.':
            //Rectangle
            toolbar(4);
            timeframeStyle(lineMenu);
            break;
        case 'k':
            //Text
            toolbar(5);
            textBox()
            break;
        case 'a':
            // Price Range
            toolbar(6);
            break;

        case 'j':
            // Demand Zone
            timeframeStyle(demandMenu);
            break;

        case 'u':
            // Supply Zone
            timeframeStyle(supplyMenu);
            break;

        //Timeframes
        case '1':
            // Monthly
            timeframe(7, 'MN', 0);
            break;
        case '2':
            // Weekly
            timeframe(6, 'WK', 1);
            break;
        case '3':
            // Daily
            timeframe(5, 'DL', 2);
            break;
        case '4':
            // Hourly
            timeframe(4, 'HL', 3);
            break;


        //Kite WatchList
        case 'F1':
            postWatchSymbol(1);
            break;
        case 'F2':
            postWatchSymbol(2);
            break;
        case 'F3':
            postWatchSymbol(3);
            break;
        case 'F4':
            postWatchSymbol(4);
            break;
        case 'F5':
            postWatchSymbol(5);
            break;

        //Misc
        case "'":
            //Undo
            document.execCommand('undo', false, null);
            break;
        default:
            fired = false;
            break;
    }

    //If Key overriden prevent default.
    if (fired) {
        e.preventDefault();
    }
}

//Hotkeys: TradingView Toolbar & Style
/**
 * Select Timeframe and Remember it
 * @param timeFrameIndex: Index to Switch to Given timeframe
 * @param name: MN/WK/DL/HL (Unused)
 * @param styleIndex: Style Index Based on Dropdown List in Styles
 */
function timeframe(timeFrameIndex, name, styleIndex) {
    $(`#header-toolbar-intervals > div:nth-child(${timeFrameIndex})`).click();
    GM_setValue(styleIndexKey, styleIndex);
}

/**
 * Based on Provided Positions Select Appropriate Style
 * @param positions
 */
function timeframeStyle(positions) {
    let tindex = GM_getValue(styleIndexKey);
    style(positions[tindex]);
}

/**
 * Clicks Favourite Toolbar on Given Index
 * @param index
 */
function toolbar(index) {
    $(`div.ui-sortable:nth-child(2) > div:nth-child(${index}) > span:nth-child(1)`).click();
}

/**
 * Clicks Appropriate Index in Dropdown.
 * @param index
 */
function style(index) {
    // Template Selector
    waitClick('a.tv-linetool-properties-toolbar__button')

    //Clicks Style based on Index.
    waitClick(`a.item:nth-child(${index})`)
}

//Hotkeys:: Kite
function postWatchSymbol(listNo) {
    let ticker = getTicker();
    //console.log('Posting WatchList Symbol:',ticker,listNo)
    GM_setValue(kiteWatchToggleKey, [listNo, ticker,Date()])
}