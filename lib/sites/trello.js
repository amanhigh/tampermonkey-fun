//Constant
var trelloTokenStore = "trelloToken"
const cardNameSelector = 'a[data-testid^=card]';

//*************** TRELLO *********************
function trello() {
    // Capture Token
    let trelloToken = decodeURIComponent(getCookie("token"));
    GM_setValue(trelloTokenStore, trelloToken);
    message("Trello Token Captured");

    // Add Trello UI
    trelloUI();

    //Override Trello Hook
    setTimeout(installTrelloHook, 2000);
}

function trelloUI() {
    buildArea(areaId, '75%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton("trello-hook", 'H', installTrelloHook))
}

function installTrelloHook() {
    let cards = $(cardNameSelector);
    cards.click(trelloOnClick);
    console.log('Installing Hook: ' + cards.length);
}

function trelloOnClick() {
    let ticker = $(this).text();
    // console.log(ticker);

    GM_setValue(alertClickedEvent, ticker);

    //Equivilant to e.preventDefault and e.stopPropagation combined.
    return false;
}