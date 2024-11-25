//TradingView:: KeyHandlers

/**
 * Handles key down events and performs various actions based on the key pressed and the state of the application.
 *
 * @param {Object} e - the key down event object
 * @return {void} 
 */
function doc_keyDown(e) {
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
}

/**
 * A function to handle non-modifier keys and perform corresponding actions.
 *
 * @param {Event} e - the key event object
 * @return {void} 
 */
function nonModifierKey(e) {
    switch (e.key) {

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

        case 't':
            // Trade
            HandleGttOrderButton();
            break;
    }
}