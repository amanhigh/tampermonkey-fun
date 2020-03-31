const lineMenu = [6, 3, 4, 5];
const demandMenu = [10, 4, 6, 8];
const supplyMenu = [11, 5, 7, 9];


//TradingView:: KeyHandlers
function doc_keyDown(e) {
    //console.log(e);
    //alert(`S Pressed: ${e.altKey} | ${e.ctrlKey} | ${e.shiftKey}`);

    //Swift Enabled
    if ($(`#${swiftId}`).prop('checked')) {
        if (isModifierKey(e.shiftKey, ':', e)) {
            // Nifty Correlation
            waitEE('div.item-3eXPhOmy:nth-child(5) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)', (e) => {
                e.dispatchEvent(new Event('touchend', {'bubbles': true}));
            })
        } else if (isModifierKey(e.ctrlKey, 'e', e)) {
            // Long Position
            toolbar(7);
        } else if (isModifierKey(e.ctrlKey, 'a', e)) {
            // Remove from TV WatchList
            removeFromWatchList()
        } else if (isModifierKey(e.ctrlKey, 'm', e)) {
            // Auto Alert
            autoAlert();
        } else if (isModifierKey(e.shiftKey, 'p', e)) {
            // Alert Reset (With Lines)
            resetAlerts(true);
        } else {
            nonModifierKey(e);
        }
    }

    //Swift Enabled and Disabled
    if (isModifierKey(e.shiftKey, 'o', e)) {
        // Flag/Unflag
        $('.uiMarker__small-1LSfKnWQ').click();
    } else if (isModifierKey(e.ctrlKey, 'b', e)) {
        // Toggle SwiftKeys
        toggleSwiftKeys(!$(`#${swiftId}`).prop('checked'));
    } else if (isModifierKey(e.shiftKey, 'enter', e)) {
        // Textbox Ok
        $('.appearance-default-dMjF_2Hu-').click();

        // Toggle SwiftKeys
        toggleSwiftKeys(true);
    } else if (isModifierKey(e.ctrlKey, 'e', e)) {
        // Toggle Exchange
        toggleExchange();
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
            // Dynamic Based on Exchange
            timeframe(getHourlyIndex(), 'HL', 3);
            break;


        //Kite WatchList
        case 'F1':
            recordOrder(0);
            break;
        case 'F2':
            recordOrder(1);
            break;
        case 'F3':
            recordOrder(2);
            break;
        case 'F4':
            recordOrder(3);
            break;
        case 'F5':
            recordOrder(4);
            break;
        case 'F10':
            syncOrders();
            break;

        //Misc
        case "'":
            //Undo
            document.execCommand('undo', false, null);
            break;
        case "p":
            //Delete All Alerts (Without Lines)
            resetAlerts();
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

function toggleSwiftKeys(checked) {
    $(`#${swiftId}`).prop('checked', checked)
    if (checked) {
        message('ENABLED'.fontcolor('green'));
    } else {
        message('DISABLED'.fontcolor('red'));
    }
    fixTitle();
}

function getHourlyIndex() {
    switch (getExchange()) {
        //4 Hourly Index
        case "BINANCE":
        case "BITFINEX":
        case "OANDA":
        case "KRAKEN":
            return 4;
        default:
            //Default 2 Hourly Timeframe
            return 3;
    }
}