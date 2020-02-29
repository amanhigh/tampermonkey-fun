const lineMenu = [6, 3, 4, 5];
const demandMenu = [10, 4, 6, 8];
const supplyMenu = [11, 51, 7, 9];


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

    if (isModifierKey(e.ctrlKey, 'a', e)) {
        // Remove from TV WatchList
        removeFromWatchList()
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

function toggleSwiftKeys(checked) {
    enabled.checked = checked;
    if (checked) {
        message('ENABLED'.fontcolor('green'));
    } else {
        message('DISABLED'.fontcolor('red'));
    }
    fixTitle();
}