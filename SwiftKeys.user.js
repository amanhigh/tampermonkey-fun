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
// @grant        GM.xmlHttpRequest
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-idle
// ==/UserScript==

const lineMenu=[6,3,4,5];
const demandMenu=[10,4,6,8];
const supplyMenu=[11,5,7,9];

const watchListKey='watchListTicker';

var enabled=document.createElement("input");
enabled.id='enabled'
enabled.setAttribute('type','checkbox');
enabled.setAttribute("style", "font-size:"+24+"px;position:absolute;top:"+50+"px;right:"+580+"px;");

var msg=document.createElement("p");
msg.setAttribute("style", "font-size:"+16+"px;position:absolute;top:"+50+"px;right:"+600+"px;");


if (location.host.includes("tradingview")) {
 tradingView();
} else {
    kite();
}

// ---------------------------------- KITE --------------------------------------------------------

function kite()
{
    GM_addValueChangeListener (
        watchListKey, (watchListKey, oldValue, newValue, bRmtTrggrd) => {
            //console.log (`WatchListAdd Event: ${newValue}`);
            handleWatchSymbol(newValue[0],newValue[1]);
    } );
}

function handleWatchSymbol(listNo,symbol)
{
    $(`.marketwatch-selector li:nth-child(${listNo})`).click();
    waitInput('#search-input',symbol);
    waitClick('.search-result-item');
}

// -------------------------------- TradingView ---------------------------------------------------------

function tradingView()
{
    document.body.appendChild(enabled);
    document.body.appendChild(msg);
    document.addEventListener('keydown', doc_keyDown, false);

    //Register Title Listner
    waitEE("title",(el)=>{
        //console.log('Observing Title: ' + el.innerHTML);
        attributeObserver(el,fixTitle);
    });

    //Listen to SwiftKeys Checkbox Changes
    enabled.addEventListener('change', fixTitle)
}

function fixTitle()
{
    var liner=' - SwiftKeys';
    //console.log('Processing Title: ' + document.title);
    //SwiftKey On and No Title Add It.
    if (enabled.checked && !document.title.includes('SwiftKeys'))
    {
        document.title= document.title + liner;
    } else if (!enabled.checked && document.title.includes('SwiftKeys'))
    {
        // SwiftKey Off and Title present.
        document.title= document.title.replace(liner,'');
    }
}

function doc_keyDown(e) {
    //console.log(e);
    //alert(`S Pressed: ${e.altKey} | ${e.ctrlKey} | ${e.shiftKey}`);

    if(isModifierKey(e.ctrlKey,'b',e)) {
        // Toggle SwiftKeys
        toggleSwiftKeys(!enabled.checked);        
    }

    if(isModifierKey(e.ctrlKey,'e',e)) {
        // Toggle Exchange
        toggleExchange();
    }

    if(isModifierKey(e.shiftKey,'enter',e)) {
        // Textbox Ok
        $('.appearance-default-dMjF_2Hu-').click();

        // Toggle SwiftKeys
        toggleSwiftKeys(true);
    }


    if (enabled.checked==true) {
        if(isModifierKey(e.shiftKey,'o',e)) {
            // Flag/Unflag
            $('.uiMarker__small-1LSfKnWQ').click();
        } else if(isModifierKey(e.shiftKey,'q',e)) {
            // Nifty Correlation
            waitEE('div.item-3eXPhOmy:nth-child(5) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)',(e) =>{e.dispatchEvent(new Event('touchend',{'bubbles': true }));})
        } else if(isModifierKey(e.ctrlKey,'e',e)) {
            // Long Position
            tvToolbar(7);
        } else {
            nonModifierKey(e);
        }
    }
}

function nonModifierKey(e)
{
    //Ignore Numpad Keys
    if (e.keyCode >= 96 && e.keyCode <=110)
    {
      return;
    }

    var fired=true;
    switch (e.key)
    {

        //Toolbar
        case ',':
            //TrendLine
            tvToolbar(2);
            timeframeStyle(lineMenu);
            break;
        case 'e':
            //FibZone
            tvToolbar(3);
            break;
        case '.':
            //Rectangle
            tvToolbar(4);
            timeframeStyle(lineMenu);
            break;
        case 'k':
            //Text
            tvToolbar(5);
            textBox()
            break;
        case 'a':
            // Price Range
            tvToolbar(6);
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
            timeframe(7,'MN',0);
            break;
        case '2':
            // Weekly
            timeframe(6,'WK',1);
            break;
        case '3':
            // Daily
            timeframe(5,'DL',2);
            break;
        case '4':
            // Hourly
            timeframe(4,'HL',3);
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
            fired=false;
            break;
    }

    //If Key overriden prevent default.
    if (fired){
        e.preventDefault();
    }
}

function toggleSwiftKeys(checked)
{
    enabled.checked=checked;
    if (checked)
    {
        msg.innerHTML='ENABLED'.fontcolor('green');
    } else
    {
        msg.innerHTML='DISABLED'.fontcolor('red');
    }
    timedClear();
    fixTitle();
}

//--------------------------- Keys Library ------------------------
function timeframe(index,name,tindex)
{
    $(`#header-toolbar-intervals > div:nth-child(${index})`).click();
    GM_setValue('tframe',name);
    GM_setValue('tindex',tindex);
}

function timeframeStyle(positions)
{
    var tindex=GM_getValue('tindex');
    tvStyle(positions[tindex]);
}

function textBox()
{
    toggleSwiftKeys(false);

    //Select Day Style
    waitClick('div.container-AqxbM340:nth-child(1)');
    waitClick('.menuBox-20sJGjtG > div:nth-child(4) > div:nth-child(1)');

    //Select Text Area
    waitEE('.textarea-bk9MQutx',(e)=> e.focus());
}

function tvStyle(index)
{
     // Template Selector
     waitClick('a.tv-linetool-properties-toolbar__button')

     //HDZ
     waitClick(`a.item:nth-child(${index})`)
}

function tvToolbar(index)
{
    $(`div.ui-sortable:nth-child(2) > div:nth-child(${index}) > span:nth-child(1)`).click();
}

function toggleExchange()
{
    var exch=$('.select-1T7DaJS6').text();
    //Open Toggle Menu
    $('.select-1T7DaJS6').click();

    if (exch=="NSE")
    {
        //Select All Exchanges
        $('.allExchanges-29JoOLdp').click();
    } else {
        //Select NSE
        $('.exchange-3hAo4mow:nth(72)').click();
    }
}

function timedClear()
{
    //Clear Boxes
    setTimeout(function(){
        msg.innerHTML="";

    },5000);
}

function postWatchSymbol(listNo)
{
    var ticker=getTicker();
    //console.log('Posting WatchList Symbol:',ticker,listNo)
    GM_setValue(watchListKey,[listNo,ticker])
}

function getTicker(){
	return $('.input-3lfOzLDc')[0].value;
}

//--------------------------- LIBRARY -----------------------------

//WaitUntilElementExists
function waitClick(selector)
{
     waitEE(selector,(e)=> e.click());
}

function waitEE(selector, callback,count=0) {
    const el = document.querySelector(selector);

    if (el) {
        return callback(el);
    }

    if (count < 3) {
        setTimeout(() => waitEE(selector, callback,count+1), 1200);
    }
     else {
        console.log("Wait Element Failed, exiting Recursion: " + selector);
    }
}

function waitInput(selector,inputValue)
{
    waitEE(selector,(e) =>{
        e.value=inputValue
        e.dispatchEvent(new Event('input',{'bubbles': true }));
    })
}

function isModifierKey(modifier,key,e){
    if (e.key.toLowerCase() == key && modifier)
    {
        e.preventDefault();
        return true;
    } else
    {
        return false;
    }
}

function attributeObserver(target,callback)
{new window.MutationObserver(function(mutations, observer) {
        var hasUpdates = false;

        for (var index = 0; index < mutations.length; index++) {
            var mutation = mutations[index];

            if (mutation.type === 'childList' && (mutation.addedNodes.length)) {
                hasUpdates = true;
                break;
            }
        }

        if (hasUpdates) {
            callback();
        }
    }).observe(target, {childList: true});
}