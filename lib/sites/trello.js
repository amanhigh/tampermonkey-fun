var trelloToken;

//*************** TRELLO *********************
function trello() {
    // Capture Token
    trelloToken = decodeURIComponent(getCookie("token"));
    message("Trello Token Captured");

}
