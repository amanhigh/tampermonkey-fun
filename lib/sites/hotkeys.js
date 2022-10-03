//TradingView:: KeyHandlers
function doc_keyDown(e) {
    //console.log(e);
    //alert(`S Pressed: ${e.altKey} | ${e.ctrlKey} | ${e.shiftKey}`);

    //If Timeframe Keys are Pressed 1-4 (Not Numeric Keypad) and Swift Keys are disabled. Enable them.
    let swiftEnabled = $(`#${swiftId}`).prop('checked');
    if (e.keyCode > 48 && e.keyCode < 53 && !swiftEnabled) {
        swiftEnabled = true;
        toggleSwiftKeys(true);
    }

    //Swift Enabled
    if (swiftEnabled) {
        if (isModifierKey(e.shiftKey, ':', e)) {
            // Nifty Correlation
            waitEE('div.item-3eXPhOmy:nth-child(5) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1)', (e) => {
                e.dispatchEvent(new Event('touchend', { 'bubbles': true }));
            })
        } else if (isModifierKey(e.ctrlKey, 'e', e)) {
            // Long Position
            favToolbar(7);
        } else if (isModifierKey(e.shiftKey, 'e', e)) {
            // Short Position
            favToolbar(8);
        } else if (isModifierKey(e.ctrlKey, 'm', e)) {
            // Auto Alert Create
            autoAlertCreate();
        } else if (isModifierKey(e.ctrlKey, 'r', e)) {
            // Auto Alert Delete
            autoAlertDelete();
        } else if (isModifierKey(e.shiftKey, 'q', e)) {
            // Relative Chart
            relativeTicker();
        } else if (isModifierKey(e.shiftKey, 'p', e)) {
            // Alert Reset (Without Lines)
            resetAlerts();
        } else if (isModifierKey(e.ctrlKey, 'f11', e)) {
            // Mark Index
            recordOrder(6);
        } else if (isModifierKey(e.ctrlKey, 'f12', e)) {
            // Mark Composite
            recordOrder(7);
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
        toggleSwiftKeys(!swiftEnabled);
    } else if (isModifierKey(e.shiftKey, 'enter', e)) {
        closeTextBox()

        // Toggle SwiftKeys
        toggleSwiftKeys(true);
    } else if (isModifierKey(e.ctrlKey, 'k', e)) {
        // Toggle Exchange
        toggleExchange();
    } else if (e.key === ' ' && isReplayActive()) {
        //Toggle Replay
        toggleReplay();
        //Prevent default Behaviour which switches to Next Ticker in Watchlist.
        e.preventDefault();

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
            favToolbar(2);
            //timeframeStyle(lineMenu); TODO: Not Working, fix
            break;
        case 'e':
            //FibZone
            favToolbar(3);
            break;
        case '.':
            //Rectangle
            favToolbar(4);
            //timeframeStyle(lineMenu);
            break;
        case 'k':
            //Text
            favToolbar(5);
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
            style('Default');
            break;

        case 'p':
            // Clear All
            clearAll();
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

        //Navigation
        case 'ArrowLeft':
            //Previous Visible
            navigateTickers(-1)
            break;
        case 'ArrowRight':
            //Next Visible
            navigateTickers(1)
            break;


        //Misc
        case "'":
            //Undo
            document.execCommand('undo', false, null);
            break;

        case 'Shift':
            //Check for Double press
            if (isDoubleKey(e)) {
                //Disable Swift Keys if double press detected
                toggleSwiftKeys(false);
            }
            //Don't block default event as TV needs to record double key.
            fired = false;
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

