const Constants = (function() {
    // Frozen public constants
    return Object.freeze({
        // Selectors
        SELECTORS: {
            BASIC: {
                NAME_SELECTOR: 'div[class*=mainTitle]', // Old name: nameSelector
                EXCHANGE_SELECTOR: 'div[class*=exchangeTitle]', // Old name: exchangeSelector
                TICKER_SELECTOR: `${this.SELECTORS.HEADER.HEADER_SELECTOR} > div` // Old name: tickerSelector
            },
            HEADER: {
                HEADER_SELECTOR: '#header-toolbar-symbol-search', // Old name: headerSelector
                SAVE_SELECTOR: '#header-toolbar-save-load', // Old name: saveSelector
                SYMBOL_FLAG_SELECTOR: 'div[class*=flagWrapper]', // Old name: symbolFlagSelector
                TIMEFRAME_SELECTOR: `#header-toolbar-intervals > div[class*=group] > button` // Old name: timeframeSelector
            },
            POPUPS: {
                SEARCH_POPUP_SELECTOR: 'input[class^=search]', // Old name: searchPopupSelector
            },
            REPLAY: {
                ACTIVE_SELECTOR: '#header-toolbar-replay[class*=isActive]', // Old name: replayActiveSelector
                PLAY_PAUSE_SELECTOR: 'div[class*=replayToolbar] span[class*=icon]:nth(1)' // Old name: replayPlayPauseSelector
            }
        }
    });
})();