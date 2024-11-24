/**
 * Application-wide constants organized by domain and functionality
 */
const Constants = (function() {
    return Object.freeze({
        // UI element colors and styles
        UI: {
            COLORS: {
                LIST: ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'], // Old name: colorList
                FNO_CSS: { 'border-top-style': 'groove', 'border-width': 'medium' }, // Old name: fnoCss
            },
            
            // UI Component IDs
            IDS: {
                AREAS: {
                    SUMMARY: 'aman-summary',  // Old Name: summaryId
                    TOP: 'aman-top',  // Old Name: topId
                    MID: 'aman-mid',  // Old Name: midId
                    ALERTS: 'aman-alerts',  // Old Name: alertsId
                    AUDIT: 'aman-audit',  // Old Name: auditId
                    ORDERS: 'aman-orders',  // Old Name: ordersId
                    JOURNAL: 'aman-journal',  // Old Name: journalId
                    FLASH: 'aman-flash'  // Old Name: flashId
                },
                INPUTS: {
                    DISPLAY: 'aman-display',  // Old Name: displayId
                    COMMAND: 'aman-input',  // Old Name: inputId
                    ENTER_KEY_CODE: 13 // Old Name: ENTER_KEY_CODE
                },
                BUTTONS: {
                    SEQUENCE: 'aman-seq',  // Old Name: seqId
                    REFRESH: 'aman-refresh',  // Old Name: refreshBtnId
                    ALERT_CREATE: 'aman-alert-create',  // Old Name: altCreateBtnId
                    JOURNAL: 'aman-journal-btn'  // Old Name: journalBtnId
                },
                CHECKBOXES: {
                    SWIFT: 'aman-swift',  // Old Name: swiftId
                    RECENT: 'aman-recent',  // Old Name: recentId
                }
            }
        },

        // DOM Selectors for TradingView components
        DOM: {
            BASIC: {
                NAME: 'div[class*=mainTitle]',              // For main title element
                TICKER: '#header-toolbar-symbol-search > div', // For ticker display
                EXCHANGE: 'div[class*=exchangeTitle]',      // For exchange name
                LTP: 'span[class^="priceWrapper"] > span:first-child'  // For last traded price
            },
            HEADER: {
                MAIN: '#header-toolbar-symbol-search', // Old name: headerSelector
                SAVE: '#header-toolbar-save-load', // Old name: saveSelector
                SYMBOL_FLAG: 'div[class*=flagWrapper]', // Old name: symbolFlagSelector
                TIMEFRAME: '#header-toolbar-intervals > div[class*=group] > button' // Old name: timeframeSelector
            },
            POPUPS: {
                SEARCH: 'input[class^=search]', // Old name: searchPopupSelector
                CLOSE_TEXTBOX: 'button:contains("Ok")', // Old name: closeTextboxSelector
            },
            REPLAY: {
                PLAY_PAUSE: 'div[class*=replayToolbar] span[class*=icon]:nth(1)' // Old name: replayPlayPauseSelector
            },
            ORDER_PANEL: {
                CLOSE: 'button[data-name="close"]', // Old name: orderPanelCloseSelector
            },
            SCREENER: {
                // TODO: Fix Symbol
                SYMBOL: 'div[class*=symbol]', // Old name: screenerSymbolSelector
                MAIN: "tbody.tv-data-table__tbody:nth(1)", // Old name: screenerSelector
                LINE: 'tr.tv-screener-table__result-row', // Old name: screenerLineSelector
            },
            WATCHLIST: {
                // TODO: Fix Symbol
                SYMBOL: 'div[class*=symbol]', // Old Name: watchListSymbolSelector
                WIDGET: 'div.widgetbar-widgetbody:first', // Old Name: watchListWidgetSelector
                CONTAINER: 'div[class^=listContainer]', // Old Name: watchListSelector
                ITEM: 'div[class*=symbol-]', // Old Name: watchListItemSelector
                LINE: 'div[class^=listContainer] > div > div' // Old Name: watchListLineSelector
            },
            FLAGS: {
                MAIN: "div[class^=uiMarker]", // Old Name: flagSelector
                MARKING: "div[class^=uiMarker] > svg > path:nth(0)" // Old Name: flagMarkingSelector
            },
            TOOLBARS: {
                MAIN: 'span.tv-favorited-drawings-toolbar__widget', // Old Name: toolbarSelector
                STYLE: 'div.floating-toolbar-react-widgets__button', // Old Name: styleSelector
                STYLE_ITEM: 'span[class^=label]' // Old Name: styleItemSelector
            },
            SIDEBAR: {
                DELETE_ARROW: 'div [data-name="removeAllDrawingTools"] button[class^=arrow]', // Old Name: deleteArrowSelector
                DELETE_DRAWING: 'div [data-name="remove-drawing-tools"]' // Old Name: deleteDrawingSelector
            }
        },

        // Trading and analysis related configuration
        TRADING: {
            ORDER: {
                RISK_LIMIT: 6400 // Old name: orderRiskLimit
            },
            PROMPT: {
                REASONS: ['dep', 'ooa', 'tiz', 'oe', 'tto', 'nca', 'tested', 'zn', 'rsi', 'max', 'base', 'er', 'nzn', 'nsprt', 'MISS', 'REC', 'WOW'], // Old name: reasons
                OVERRIDES: ['egf', 'int', 'lc', 'loc', 'doji', 'big', 'pn', 'tc', 'cfl', 'acm', 'adv'] // Old name: overrides
            },
            ZONES: { // Old name: ZoneType - Moved from EXCHANGE as suggested
                DEMAND: { symbol: "DZ" },
                SUPPLY: { symbol: "SZ" }
            }
        },

        // Storage keys for persistent data
        STORAGE: {
            SILOS: {
                DATA: 'dataSilo', // Old Name: dataSiloStore
                ORDER_INFO: 'orderSilo', // Old Name: orderInfoStore
                FLAG_INFO: 'flagSilo', // Old Name: flagInfoStore
                PAIR_MAP: 'pairSilo' // Old Name: pairMapStore
            },
            EVENTS: {
                GTT_ORDER: "gttOrderEvent", // Old Name: gttOrderEvent
                TV_WATCH_CHANGE: "tvWatchChangeEvent", // Old Name: tvWatchChangeEvent
                ALERT_CLICKED: "alertClickedEvent", // Old Name: alertClickedEvent
                GTT_REQUEST: "gttRequest" // Old Name: gttRequest
            }
        },

        // Time frame and sequence configurations
        TIME: {
            SEQUENCE_TYPES: {
                DEFAULT: 'MWD', // Old Name: DEFAULT_SEQUENCE
                HIGH: 'YR' // Old Name: HIGH_SEQUENCE
            },
            FRAMES: { // Old name: TimeFrame
                DAILY: { index: 3, symbol: "D", style: "I" },
                WEEKLY: { index: 4, symbol: "WK", style: "H" },
                MONTHLY: { index: 5, symbol: "MN", style: "VH" },
                THREE_MONTHLY: { index: 6, symbol: "TMN", style: "T" },
                SIX_MONTHLY: { index: 7, symbol: "SMN", style: "I" }
            },
            SEQUENCES: { // Old name: timeFrameBar
                MWD: ['THREE_MONTHLY', 'MONTHLY', 'WEEKLY', 'DAILY'],
                YR: ['SIX_MONTHLY', 'THREE_MONTHLY', 'MONTHLY', 'WEEKLY']
            }
        },

        // Exchange and market related constants
        EXCHANGE: {
            TYPES: {
                NSE: 'NSE', // Old Name: NSE_EXCHANGE
            },
            FNO_SYMBOLS: new Set(['AARTIIND', 'ABB', 'ABBOTINDIA', 'ABCAPITAL', 'ABFRL', 'ACC', 'ADANIENT', 'ADANIPORTS', 'ALKEM', 'AMBUJACEM', 'APOLLOHOSP', 'APOLLOTYRE', 'ASHOKLEY', 'ASIANPAINT', 'ASTRAL', 'ATUL', 'AUBANK', 'AUROPHARMA', 'AXISBANK', 'BAJAJ_AUTO', 'BAJAJFINSV', 'BAJFINANCE', 'BALKRISIND', 'BALRAMCHIN', 'BANDHANBNK', 'BANKBARODA', 'BATAINDIA', 'BEL', 'BERGEPAINT', 'BHARATFORG', 'BHARTIARTL', 'BHEL', 'BIOCON', 'BOSCHLTD', 'BPCL', 'BRITANNIA', 'BSOFT', 'CANBK', 'CANFINHOME', 'CHAMBLFERT', 'CHOLAFIN', 'CIPLA', 'COALINDIA', 'COFORGE', 'COLPAL', 'CONCOR', 'COROMANDEL', 'CROMPTON', 'CUB', 'CUMMINSIND', 'DABUR', 'DALBHARAT', 'DEEPAKNTR', 'DELTACORP', 'DIVISLAB', 'DIXON', 'DLF', 'DRREDDY', 'EICHERMOT', 'ESCORTS', 'EXIDEIND', 'FEDERALBNK', 'FSL', 'GAIL', 'GLENMARK', 'GMRINFRA', 'GNFC', 'GODREJCP', 'GODREJPROP', 'GRANULES', 'GRASIM', 'GUJGASLTD', 'HAL', 'HAVELLS', 'HCLTECH', 'HDFC', 'HDFCAMC', 'HDFCBANK', 'HDFCLIFE', 'HEROMOTOCO', 'HINDALCO', 'HINDCOPPER', 'HINDPETRO', 'HINDUNILVR', 'HONAUT', 'IBULHSGFIN', 'ICICIBANK', 'ICICIGI', 'ICICIPRULI', 'IDEA', 'IDFC', 'IDFCFIRSTB', 'IEX', 'IGL', 'INDHOTEL', 'INDIACEM', 'INDIAMART', 'INDIGO', 'INDUSINDBK', 'INDUSTOWER', 'INFY', 'INTELLECT', 'IOC', 'IPCALAB', 'IRCTC', 'ITC', 'JINDALSTEL', 'JKCEMENT', 'JSWSTEEL', 'JUBLFOOD', 'KOTAKBANK', 'L_TFH', 'LALPATHLAB', 'LAURUSLABS', 'LICHSGFIN', 'LT', 'LTI', 'LTIM', 'LTTS', 'LUPIN', 'M_M', 'M_MFIN', 'MANAPPURAM', 'MARICO', 'MARUTI', 'MCDOWELL_N', 'MCX', 'METROPOLIS', 'MFSL', 'MGL', 'MOTHERSON', 'MPHASIS', 'MRF', 'MUTHOOTFIN', 'NATIONALUM', 'NAUKRI', 'NAVINFLUOR', 'NESTLEIND', 'NMDC', 'NTPC', 'OBEROIRLTY', 'OFSS', 'ONGC', 'PAGEIND', 'PEL', 'PERSISTENT', 'PETRONET', 'PFC', 'PIDILITIND', 'PIIND', 'PNB', 'POLYCAB', 'POWERGRID', 'PVR', 'RAIN', 'RAMCOCEM', 'RBLBANK', 'RECLTD', 'RELIANCE', 'SAIL', 'SBICARD', 'SBILIFE', 'SBIN', 'SHREECEM', 'SHRIRAMFIN', 'SIEMENS', 'SRF', 'SRTRANSFIN', 'SUNPHARMA', 'SUNTV', 'SYNGENE', 'TATACHEM', 'TATACOMM', 'TATACONSUM', 'TATAMOTORS', 'TATAPOWER', 'TATASTEEL', 'TCS', 'TECHM', 'TITAN', 'TORNTPHARM', 'TORNTPOWER', 'TRENT', 'TVSMOTOR', 'UBL', 'ULTRACEMCO', 'UPL', 'VEDL', 'VOLTAS', 'WHIRLPOOL', 'WIPRO', 'ZEEL', 'ZYDUSLIFE']), // Old Name: fnoSymbols
        }
    });
})();