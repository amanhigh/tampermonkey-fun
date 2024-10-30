const Constants = (function() {
    // Frozen public constants
    return Object.freeze({
        // Selectors
        SELECTORS: {
            BASIC: {
                NAME_SELECTOR: 'div[class*=mainTitle]', // Old name: nameSelector
                EXCHANGE_SELECTOR: 'div[class*=exchangeTitle]', // Old name: exchangeSelector
                TICKER_SELECTOR: `${this.SELECTORS.HEADER.HEADER_SELECTOR} > div`, // Old name: tickerSelector
                LTP_SELECTOR: 'span[class^="priceWrapper"] > span:first-child' // Old name: ltpSelector
            },
            HEADER: {
                SELECTOR: '#header-toolbar-symbol-search', // Old name: headerSelector
                SAVE_SELECTOR: '#header-toolbar-save-load', // Old name: saveSelector
                SYMBOL_FLAG_SELECTOR: 'div[class*=flagWrapper]', // Old name: symbolFlagSelector
                TIMEFRAME_SELECTOR: `#header-toolbar-intervals > div[class*=group] > button` // Old name: timeframeSelector
            },
            POPUPS: {
                SEARCH_POPUP_SELECTOR: 'input[class^=search]', // Old name: searchPopupSelector
                AUTO_ALERT_SELECTOR: "span:contains(\'Copy price\')",
                CLOSE_TEXTBOX_SELECTOR: 'button:contains("Ok")', // Old name: closeTextboxSelector
            },
            REPLAY: {
                ACTIVE_SELECTOR: '#header-toolbar-replay[class*=isActive]', // Old name: replayActiveSelector
                PLAY_PAUSE_SELECTOR: 'div[class*=replayToolbar] span[class*=icon]:nth(1)' // Old name: replayPlayPauseSelector
            },
            ORDER_PANEL: {
                CLOSE_SELECTOR: 'button[data-name="close"]', // Old name: orderPanelCloseSelector
                RISK_LIMIT: 6400 // Old name: orderRiskLimit
            },
            SMART_PROMPT: {
                REASONS: ['dep', 'ooa', 'tiz', 'oe', 'tto', 'nca', 'tested', 'zn', 'rsi', 'max', 'base', 'er', 'nzn', 'nsprt', 'MISS', 'REC', 'WOW'], // Old name: reasons
                OVERRIDES: ['egf', 'int', 'lc', 'loc', 'doji', 'big', 'pn', 'tc', 'cfl', 'acm', 'adv'] // Old name: overrides
            },
            SCREENER: {
                SELECTOR: "tbody.tv-data-table__tbody:nth(1)", // Old name: screenerSelector
                LINE_SELECTOR: `tr.tv-screener-table__result-row`, // Old name: screenerLineSelector
                SYMBOL_SELECTOR: '.tv-_symbol', // Old name: screenerSymbolSelector
                SELECTED_SELECTOR: '.tv-screener-table__result-row--selected', // Old name: screenerSelectedSelector
                BUTTON_SELECTOR: 'button[data-name=toggle-visibility-button]'
            },
            WATCHLIST:{
                WIDGET_SELECTOR : 'div.widgetbar-widgetbody:first' ,  //Old Name : watchListWidgetSelector 
                SELECTOR : `div[class^=listContainer]`,  //Old Name : watchListSelector 
                ITEM_SELECTOR : `div[class*=symbol-]`,  //Old Name : watchListItemSelector 
                LINE_SELECTOR : `${this.SELECTOR} > div > div`,  //Old Name : watchListLineSelector 
                SYMBOL_SELECTOR : 'span[class*=symbolNameText]',  //Old Name : watchListSymbolSelector 
                SELECTED_SELECTOR : 'div[class*=selected]' ,  //Old Name : watchListSelectedSelector 
            },
            FLAGS:{
                SELECTOR : "div[class^=uiMarker]",  //Old Name : flagSelector 
                MARKING_SELECTOR : `${this.FLAG_SELECTOR} > svg > path:nth(0)`  //Old Name : flagMarkingSelector 
            },
            TOOLBARS:{
                SELECTOR : 'span.tv-favorited-drawings-toolbar__widget' ,  //Old Name : toolbarSelector 
                STYLE_SELECTOR : 'div.floating-toolbar-react-widgets__button' ,  //Old Name : styleSelector 
                STYLE_ITEM_SELECTOR : `span[class^=label]`   //Old Name : styleItemSelector 
            },
            SIDEBAR:{
               DELETE_ARROW_SELECTOR : 'div [data-name="removeAllDrawingTools"] button[class^=arrow]',  //Old Name : deleteArrowSelector 
               DELETE_DRAWING_SELECTOR : 'div [data-name="remove-drawing-tools"]'   //Old Name : deleteDrawingSelector 
           }
        }
    });
})();