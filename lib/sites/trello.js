//Constant
var trelloTokenStore = "trelloToken"

//*************** TRELLO *********************
function trello() {
    // Capture Token
    let trelloToken = decodeURIComponent(getCookie("token"));
    GM_setValue(trelloTokenStore, trelloToken);
    message("Trello Token Captured");

    // Add Trello UI
    trelloUI();

    //Override Trello Hook
    setTimeout(installTrelloHook,10000);
}

function trelloUI(){
    buildArea(areaId, '75%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton("trello-hook", 'H', installTrelloHook))
}

function installTrelloHook() {
    let cards=$('span.js-card-name');
    cards.click(trelloOnClick);
    message('Installing Hook: ' + cards.length);
}

function trelloOnClick() {
    let ticker=$(this).contents().get(1).nodeValue;
    let tickerSplit = ticker.split(" ");
    // console.log(ticker,tickerSplit[0]);

    GM_setValue(alertClickedEvent, tickerSplit[0]);

    //Equivilant to e.preventDefault and e.stopPropagation combined.
    return false;
}