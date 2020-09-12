//Events
const gttOrderEvent = "gttOrderEvent"

const margin = 0.005;

//*************** KITE *********************
function trello() {
    //Setup Area
    buildArea('aman-area').css('left', '50%').appendTo('body');

    //Add Buttons
    buildButton('aman-run', 'Run', createCard).appendTo('#aman-area');
}

function createCard() {
    //Create New Card from Template
    waitClick(".icon-template-card:nth(4)");

    //Select Template
    waitClick('.kbyD4YtX9f__Fj:contains("WDH2-CT-F")');

    //Set Ticker
    $('textarea._1lfupGZ_Pw3Omh').val("AMAN")


    //Create Card
    waitClick('span.css-t5emrf');
}

