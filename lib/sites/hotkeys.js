//In memory Store
var doubleKeyMap = {};

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
        } else if (isModifierKey(e.shiftKey, 'e', e)) {
            // Short Position
            toolbar(8);
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
        toggleFlag()
    } else if (isModifierKey(e.ctrlKey, 'b', e)) {
        // Toggle SwiftKeys
        toggleSwiftKeys(!$(`#${swiftId}`).prop('checked'));
    } else if (isModifierKey(e.shiftKey, 'enter', e)) {
        // Textbox Ok
        $('button.intent-primary-1-IOYcbg:nth(1)').click();

        // Toggle SwiftKeys
        toggleSwiftKeys(true);
    } else if (isModifierKey(e.ctrlKey, 'k', e)) {
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

        case 'i':
            // Fib
            style(2);
            break;

        //Timeframes
        case '0':
            // Scalp
            toggleScalp();
            break;
        case '1':
            // VHTF
            timeframe(0);
            break;
        case '2':
            // HTF
            timeframe(1);
            break;
        case '3':
            // ITF
            timeframe(2);
            break;
        case '4':
            // TTF (Dynamic Based on Exchange)
            timeframe(3);
            break;


        //Record Order
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

        //Flag Set
        case 'F6':
            //Consolidation
            recordFlag(0);
            break;
        case 'F7':
            //Red Shorts
            recordFlag(1);
            break;
        case 'F8':
            //Blue Crypto
            recordFlag(2);
            break;
        case 'F9':
            recordFlag(3);
            break;
        case 'F10':
            //Green Longs
            recordFlag(4);
            break;
        case 'F11':
            //Brown Index
            recordFlag(6);
            break;
        case 'F12':
            //Golden XAU
            recordFlag(7);
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

function isDoubleKey(key) {
    // message(`Is Double Check for ${key}`)
    if (doubleKeyMap[key]) {
        // message(`Double Detected for ${key}`)
        return true;
    } else {
        doubleKeyMap[key] = true;
        waitOn("doubleKeyInput", 100, () => {
            doubleKeyMap.delete(key);
            // message(`Cleared Double Key ${key}`)
        })
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

