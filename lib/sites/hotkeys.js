//TradingView:: KeyHandlers

/**
 * Handles key down events and performs various actions based on the key pressed and the state of the application.
 *
 * @param {Object} e - the key down event object
 * @return {void} 
 */
function doc_keyDown(e) {
    //console.log(e);
    //console.log(`Pressed: ${e.altKey} | ${e.ctrlKey} | ${e.shiftKey} | ${e.code}`);

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
            SelectToolbar(6);
        } else if (isModifierKey(e.shiftKey, 'e', e)) {
            // Short Position
            SelectToolbar(7);
        } else if (isModifierKey(e.ctrlKey, 'm', e)) {
            // Auto Alert Create
            AlertCreateSmart();
        } else if (isModifierKey(e.ctrlKey, 'r', e)) {
            // Auto Alert Delete
            AlertDeleteSmart();
        } else if (isModifierKey(e.shiftKey, 'q', e)) {
            // Relative Chart
            OpenBenchmarkTicker();
        } else if (isModifierKey(e.shiftKey, 'p', e)) {
            // Alert Reset (Without Lines)
            ResetAlerts();
        } else if (isModifierKey(e.ctrlKey, 'f12', e)) {
            // Mark Index
            RecordList(6);
        } else if (isModifierKey(e.ctrlKey, 'f11', e)) {
            // Mark Composite
            RecordList(7);
        } else if (isModifierKey(e.altKey, 't', e)) {
            // Navigate Previous
            NavigateTickers(-1)
        } else if (isModifierKey(e.altKey, 'd', e)) {
            // Navigate Next
            NavigateTickers(1)
        } else {
            nonModifierKey(e);
        }
    }

    //Swift Enabled and Disabled
    if (isModifierKey(e.shiftKey, 'o', e)) {
        // Flag/Unflag
        ToggleFlag()
    } else if (isModifierKey(e.ctrlKey, 'b', e)) {
        focusInput();
    } else if (isModifierKey(e.shiftKey, 'enter', e)) {
        CloseTextBox()
        // Toggle SwiftKeys
        toggleSwiftKeys(true);
    } else if (e.key === ' ' && isReplayActive()) {
        //Toggle Replay
        ToggleReplay();
        //Prevent default Behaviour which switches to Next Ticker in Watchlist.
        e.preventDefault();
    } else if (e.key == "Shift") {
        if (isDoubleKey(e)) {
            //Toggle Swift Keys if double press detected
            toggleSwiftKeys(!swiftEnabled);
        }
    } else if (isModifierKey(e.altKey, 'b', e)) {
        // Disable SwiftKeys
        toggleSwiftKeys(false);
    }
}

/**
 * A function to handle non-modifier keys and perform corresponding actions.
 *
 * @param {Event} e - the key event object
 * @return {void} 
 */
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
            SelectToolbar(1);
            break;
        case 'e':
            //FibZone
            SelectToolbar(2);
            break;
        case '.':
            //Rectangle
            SelectToolbar(3);
            //timeframeStyle(lineMenu);
            break;
        case 'k':
            //Text
            ReasonPrompt((reason) => {
                ClipboardCopy(timeFrame.symbol + " - " + reason);
                SelectToolbar(4);
            })
            break;

        case 'j':
            // Demand Zone
            SelectTimeFrameStyle(ZoneType.DEMAND);
            break;

        case 'u':
            // Supply Zone
            SelectTimeFrameStyle(ZoneType.SUPPLY);
            break;

        case 'i':
            // Alert Auditing
            ShowAuditAlertPopup();
            break;

        case 'p':
            // Clear All
            ClearAll();
            break;

        case 't':
            // Trade
            HandleGttOrderButton();
            break;

        //Timeframes
        case '0':
            FreezeSequence();
            break;
        case '1':
            // VHTF
            SelectTimeframe(0);
            break;
        case '2':
            // HTF
            SelectTimeframe(1);
            break;
        case '3':
            // ITF
            SelectTimeframe(2);
            break;
        case '4':
            // TTF
            SelectTimeframe(3);
            break;


        //Record Order
        case 'F1':
            RecordList(0);
            break;
        case 'F2':
            RecordList(1);
            break;
        case 'F3':
            RecordList(2);
            break;
        case 'F4':
            RecordList(3);
            break;
        case 'F5':
            RecordList(4);
            break;

        //Flag Set
        case 'F6':
            //Consolidation
            RecordFlag(0);
            break;
        case 'F7':
            //Red Shorts
            RecordFlag(1);
            break;
        case 'F8':
            //Blue Crypto
            RecordFlag(2);
            break;
        case 'F9':
            RecordFlag(3);
            break;
        case 'F10':
            //Green Longs
            RecordFlag(4);
            break;
        case 'F11':
            //Brown Index
            RecordFlag(6);
            break;
        case 'F12':
            //Golden XAU
            RecordFlag(7);
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

/**
 * Toggles the state of the Swift keys based on the checked parameter.
 *
 * @param {boolean} checked - The state to set the Swift keys to
 * @return {void} 
 */
function toggleSwiftKeys(checked) {
    $(`#${swiftId}`).prop('checked', checked)
    if (checked) {
        message('ENABLED', 'green');
    } else {
        message('DISABLED', 'red');
    }
    EnableSwiftKey();
}
