//Constant
var trelloTokenStore = "trelloToken"

//*************** TRELLO *********************
function trello() {
    // Capture Token
    let trelloToken = decodeURIComponent(getCookie("token"));
    GM_setValue(trelloTokenStore, trelloToken);
    message("Trello Token Captured");

}
