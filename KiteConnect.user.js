// ==UserScript==
// @name         KiteConnect
// @namespace    aman
// @version      1.0
// @description  Kite Connector
// @author       Amanpreet Singh
// @match        https://kite.zerodha.com/*
// @match        http://www.example.net/
// @match        https://in.tradingview.com/chart/*
// @match        https://in.investing.com/members-admin/alerts-feed
// @grant        GM_listValues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @run-at document-idle
// ==/UserScript==



const tickerKey = "tickers";
const alertTickerKey = "alertTicker";
const tickerNameKey = "tickerNames";
const nameLength = 10;
const colorList = ['orange','red','dodgerblue','cyan','lime','greenyellow','brown'];

if (location.host.includes("tradingview")) {
 tradingView();
} else if (location.pathname.includes("alerts-feed")) {
 alertFeed();
} else {
    kite();
}

// ---------------------------- ALERT FEED -------------------------------
function alertFeed()
{

    //Button to add alert Handler on Scrolled Pages (Improve find Better Way)
    var fastGtt=document.createElement("input");
    fastGtt.type="button";
    fastGtt.value="Hook";
    fastGtt.onclick = hookAlertChecker;
    fastGtt.setAttribute("style", "font-size:"+10+"px;position:absolute;top:"+100+"px;right:"+200+"px;");
    document.body.appendChild(fastGtt);

    //Listen to Ticker Name Changes
    GM_addValueChangeListener (
        tickerNameKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
            //console.log (`Received new event: ${newValue}`);
            paintAlertFeed();
    });

    paintAlertFeed();

    //Add AlertTicker Click Handler
    hookAlertChecker();
}

function hookAlertChecker()
{
    $('.alertDataTitle').click(postAlertTicker);
}

function paintAlertFeed()
{
    var names= GM_getValue(tickerNameKey);
    //console.log('Painting Alert Feed', names);

    $("div.alertNotifData > a").each((i,e)=> {
        //Check if Alert Name exists in Watch List Names;
        if (names.includes(e.innerHTML.toLowerCase().substring(0,nameLength)))
        {
            $(e).css('color', 'orangered');
        } else {
            $(e).css('color','white');
        }
    });
}

function postAlertTicker(event){
  event.preventDefault();
  //console.log('Posting AlertTicker: ' + this.innerHTML);
  GM_setValue(alertTickerKey,this.text);
};

// ---------------------------- KITE -------------------------------
function kite()
{
    //Listen to Ticker Changes
    waitEE(".vddl-list",(el)=>{nodeObserver(el,watchListChanged)});
}

function watchListChanged()
{
    //Read Current WachInfo from Local Store
    var watchInfo=JSON.parse(localStorage.getItem("__storejs_kite_marketwatch/watchInfo"));

    //Read Current index and Symbols in Watch List
    var index=JSON.parse(localStorage.getItem("__storejs_kite_marketwatch/currentWatchId"))
    var names=$('.nice-name').map(function(){
        return this.innerHTML;
    }).toArray();

    //console.log(index,names,watchInfo);

    //Update Names in Current WatchList
    watchInfo[index]=names;

    //Write to Local Store for future reference
    localStorage.setItem("__storejs_kite_marketwatch/watchInfo",JSON.stringify(watchInfo));

    //Send Event to Trading View
    GM_setValue(tickerKey,watchInfo);
    //console.log("WatchList Change Detected");
}


// -------------------------- TradingView -----------------------------

var summary;

function tradingView()
{
    //Listen for Ticker Changes
    GM_addValueChangeListener (
        tickerKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
            //console.log (`TickerKey : ${newValue}`);
            paintWatchList();
    } );

    //Listen for AlertFeed Event
    GM_addValueChangeListener (
        alertTickerKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
            //console.log (`AlertTicker: ${newValue}`);
            //Required for proper alert Opening
            openTicker('DHFL'); // DO NOT REMOVE DHFL Line
            openTicker(newValue);
    } );

    summary=document.createElement("p");
    summary.setAttribute("style", "font-size:"+15+"px;position:absolute;top:"+80+"px;right:"+460+"px;");
    summary.innerHTML="Summary:"
    document.body.appendChild(summary);


    //Onload WatchList Paint
    waitEE(".tree-T6PqyYoA",(el)=>{
        paintWatchList();
        nodeObserver(el,paintAll);

        //Onload Details Paint
        waitEE(".dl-header-symbol-desc",(el)=>{            
            nodeObserver(el,paintDetails);
        });

        //Onload Screener Paint
        waitEE(".tv-data-table",(el)=>{
            attributeObserver(el,paintScreener);
        });
        
    });

    //console.log("KiteConnect Listners Added")
}

function updateSummary()
{
    var msg="Summary: "
    var watchInfo=GM_getValue(tickerKey);
    //console.log(watchInfo);

    for(var i=0;i <5; i++)
    {
        msg+=watchInfo[i].length.toString().fontcolor(colorList[i])+'|';
    }
    msg+=getWatchListTickers().length.toString().fontcolor(colorList[5]);
    summary.innerHTML=msg;
    //console.log(msg);

}

function paintAll()
{
    paintWatchList();
    paintScreener();
    paintDetails();    
}

function paintWatchList()
{
    var sel='symbolNameText-2EYOR9jS';
    //Reset Color
    $(`.${sel}`).css('color', 'white');
    //Paint Index
    var indexSymbols=['CNXMIDCAP','CNXSMALLCAP','IXIC','DXY','NIFTY','NIFTYJR','US10Y','USOIL','USDINR','XAUUSD','XAGUSD','SHCOMP'];
    paint(sel,indexSymbols,colorList[6]);
    //Paint Kite
    paintTickers(sel);
    updateSummary();

    //To be Used on Alert Feed; Delay Required as during paint it has nse:symbol but we require name.
    setTimeout(()=> GM_setValue(tickerNameKey,getWatchListNames()),1000);
    //console.log("Painting WatchList");
}

function paintScreener()
{
    var sel='tv-screener__symbol';

    //Must Run in this Order- Clear, WatchList, Kite
    $(`.${sel}`).css('color', 'white');

    paintWatchListTickers(sel);
    paintTickers(sel);
    //console.log("Painting Screener");
}

function paintDetails()
{
    var ref=$(".dl-header > div:nth-child(1) > a:nth-child(2)").attr('href')
    if (ref)
    {
        var symbol=ref.split("-")[1].replace('/','');        
        var $target=$(".dl-header-symbol-desc");
        //Check if href contains symbol then paint stock name
        if (getWatchListTickers().includes(symbol)){
            $target.css('color', colorList[5]);
        }
        else{
            $target.css('color', 'white');
        }

        //console.log("Painting Details");
    }
}

function getWatchListTickers()
{
    return $('.symbolNameText-2EYOR9jS').toArray().map(s=>s.innerHTML);
}

function getWatchListNames()
{
    return $('div.symbol-17NLytxZ').map((i,e)=> e.title.split(',')[0].toLowerCase().substring(0,nameLength)).toArray();
}

function paintWatchListTickers(selector)
{    
    paint(selector,getWatchListTickers(),colorList[5]);
}

function paintTickers(selector) {
    var watchInfo=GM_getValue(tickerKey);
    //console.log(watchInfo);

    for(var i=0;i <5; i++)
    {
        paint(selector,watchInfo[i],colorList[i]);
    }    
}

function paint(selector,symbols,colour)
{
    for(const sym of symbols){
        $(`.${selector}:contains("${sym}")`).css('color', colour);
    }
}

//Call Twice if doesn't work once.
function openTicker(ticker)
{
    waitInput('input',ticker);
    waitClick("td.symbol-edit-popup-td");
}