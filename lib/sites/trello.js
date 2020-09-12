var trelloToken;

//*************** KITE *********************
function trello() {
    // Capture Token
    trelloToken = getCookie("token");
    message("Trello Token Captured");

    //Setup Area
    buildArea('aman-area').css('left', '50%').appendTo('body');

    //Add Buttons
    buildButton('aman-run', 'Run', run).appendTo('#aman-area');
}

function run() {
    createTrelloCard("Aman", templateIdMap["WDH2-CT-F"], notTakenListId);
}