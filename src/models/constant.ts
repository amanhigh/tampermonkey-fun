import { SequenceMap, SequenceType, TimeFrameConfig, TimeFrame, TimeFrameMap } from './trading';

/**
 * Application-wide constants organized by domain and functionality
 */
export const Constants = Object.freeze({
  // UI element colors and styles
  UI: {
    COLORS: {
      LIST: ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'], // Old name: colorList
      DEFAULT: 'white',
      FNO_CSS: { 'border-top-style': 'groove', 'border-width': 'medium' }, // Old name: fnoCss
    },

    // UI Component IDs
    IDS: {
      AREAS: {
        MAIN: 'aman-area', // Old Name: areaId
        SUMMARY: 'aman-summary', // Old Name: summaryId
        TOP: 'aman-top', // Old Name: topId
        MID: 'aman-mid', // Old Name: midId
        ALERTS: 'aman-alerts', // Old Name: alertsId
        AUDIT: 'aman-audit', // Old Name: auditId
        ORDERS: 'aman-orders', // Old Name: ordersId
        JOURNAL: 'aman-journal', // Old Name: journalId
        FLASH: 'aman-flash', // Old Name: flashId
      },
      INPUTS: {
        DISPLAY: 'aman-display', // Old Name: displayId
        COMMAND: 'aman-input', // Old Name: inputId
        ENTER_KEY_CODE: 13, // Old Name: ENTER_KEY_CODE
      },
      BUTTONS: {
        SEQUENCE: 'aman-seq', // Old Name: seqId
        REFRESH: 'aman-refresh', // Old Name: refreshBtnId
        ALERT_CREATE: 'aman-alert-create', // Old Name: altCreateBtnId
        JOURNAL: 'aman-journal-btn', // Old Name: journalBtnId
        HOOK: 'aman-hook', // Add this line
        RECENT: 'aman-recent', // Old Name: recentId
      },
      CHECKBOXES: {
        SWIFT: 'aman-swift', // Old Name: swiftId
      },
    },
  },

  // DOM Selectors for TradingView components
  DOM: {
    BASIC: {
      NAME: 'div[class*=mainTitle]', // For main title element
      TICKER: '#header-toolbar-symbol-search > div', // For ticker display
      EXCHANGE: 'div[class*=exchangeTitle]', // For exchange name
      LTP: 'span[class^="priceWrapper"] > span:first-child', // For last traded price
    },
    HEADER: {
      MAIN: '#header-toolbar-symbol-search', // Old name: headerSelector
      SAVE: '#header-toolbar-save-load', // Old name: saveSelector
      SYMBOL_FLAG: 'div[class*=flagWrapper]', // Old name: symbolFlagSelector
      TIMEFRAME: '#header-toolbar-intervals > div[class*=group] > button', // Old name: timeframeSelector
    },
    POPUPS: {
      SEARCH: 'input[class^=search]', // Old name: searchPopupSelector
      CLOSE_TEXTBOX: 'button:contains("Ok")', // Old name: closeTextboxSelector
      AUTO_ALERT: "span:contains('Copy price')", // Old name: autoAlertSelector
    },
    REPLAY: {
      PLAY_PAUSE: 'div[class*=replayToolbar] span[class*=icon]:nth(1)', // Old name: replayPlayPauseSelector
    },
    ORDER_PANEL: {
      CLOSE: 'button[data-name="close"]', // Old name: orderPanelCloseSelector
      GTT_BUTTON: '[data-role="gtt-button"]',
      INPUTS: {
        ENTRY_PRICE: 'input[data-property-id="Risk/RewardlongEntryPrice"]',
        PROFIT_PRICE: 'input[data-property-id="Risk/RewardlongProfitLevelPrice"]',
        STOP_PRICE: 'input[data-property-id="Risk/RewardlongStopLevelPrice"]',
      },
    },
    SCREENER: {
      SYMBOL: '.tv-screener__symbol', // Old name: screenerSymbolSelector
      MAIN: 'tbody.tv-data-table__tbody:nth(1)', // Old name: screenerSelector
      LINE: 'tr.tv-screener-table__result-row', // Old name: screenerLineSelector
      BUTTON: 'button[data-name=toggle-visibility-button]', // Old name: screenerButtonSelector
      SELECTED: '.tv-screener-table__result-row--selected', // Old name: screenerSelectedSelector
    },
    WATCHLIST: {
      SYMBOL: 'span[class*=symbolNameText]', // Old Name: watchListSymbolSelector
      WIDGET: 'div.widgetbar-widgetbody:first', // Old Name: watchListWidgetSelector
      CONTAINER: 'div[class^=listContainer]', // Old Name: watchListSelector
      ITEM: 'div[class*=symbol-]', // Old Name: watchListItemSelector
      LINE: 'div[class^=listContainer] > div > div', // Old Name: watchListLineSelector
      SELECTED: 'div[class*=selected]', // Old Name: watchListSelectedSelector
    },
    FLAGS: {
      SYMBOL: 'div[class^=uiMarker]', // Old Name: symbolFlagSelector
      MARKING: 'div[class^=uiMarker] > svg > path:nth(0)', // Old Name: flagMarkingSelector
    },
    TOOLBARS: {
      MAIN: 'span.tv-favorited-drawings-toolbar__widget', // Old Name: toolbarSelector
      STYLE: 'div.floating-toolbar-react-widgets__button:first', // Old Name: styleSelector
      STYLE_ITEM: 'span[class^=label]', // Old Name: styleItemSelector
      TEXT: 4, // Toolbar index for text input
    },
    ALERT_FEED: {
      WRAPPER: 'div.alertWrapper',
      FLOATING_WRAPPER: 'div.floatingAlertWrapper',
      ALERT_DATA: 'div.alertNotifData > a',
      ALERT_TITLE: '.alertDataTitle',
    },
    SIDEBAR: {
      DELETE_ARROW: 'div [data-name="removeAllDrawingTools"] button[class^=arrow]', // Old Name: deleteArrowSelector
      DELETE_DRAWING: 'div [data-name="remove-drawing-tools"]', // Old Name: deleteDrawingSelector
    },
  },

  // Trading and analysis related configuration
  TRADING: {
    ORDER: {
      RISK_LIMIT: 6400, // Old name: orderRiskLimit
    },
    PROMPT: {
      REASONS: [
        'dep',
        'ooa',
        'tiz',
        'oe',
        'tto',
        'nca',
        'tested',
        'zn',
        'rsi',
        'resp',
        'max',
        'base',
        'er',
        'nzn',
        'nsprt',
        'MISS', // Missed It.
        'SWITCH', // Switched Timeframe for Trade.
        'REC', // Recording Done
        'WOW', // Waiting WoW
      ], // Old name: reasons
      OVERRIDES: ['egf', 'int', 'lc', 'loc', 'doji', 'big', 'pn', 'tc', 'cfl', 'acm', 'adv'], // Old name: overrides
    },
    ZONES: {
      // Old name: ZoneType - Moved from EXCHANGE as suggested
      DEMAND: 'DZ',
      SUPPLY: 'SZ',
    },
  },

  // Storage keys for persistent data
  STORAGE: {
    SILOS: {
      DATA: 'dataSilo', // Old Name: dataSiloStore
      ORDER_INFO: 'orderSilo', // Old Name: orderInfoStore
      FLAG_INFO: 'flagSilo', // Old Name: flagInfoStore
      PAIR_MAP: 'pairSilo', // Old Name: pairMapStore
    },
    EVENTS: {
      ALERT_FEED_UPDATE: 'alertFeedEvent', // Old Name: tvWatchChangeEvent
      ALERT_CLICKED: 'alertClickedEvent', // Old Name: alertClickedEvent
      GTT_REFERSH: 'gttRefereshEvent', // Old Name: gttOrderEvent
      GTT_CREATE: 'gttCreateEvent', // Old Name: gttRequest
      GTT_DELETE: 'gttDeleteEvent',
    },
  },

  // Time frame and sequence configurations
  TIME: {
    SEQUENCE_TYPES: {
      DEFAULT: SequenceType.MWD,
      HIGH: SequenceType.YR,
      FRAMES: {
        [TimeFrame.DAILY]: new TimeFrameConfig('D', 'I', 2),
        [TimeFrame.WEEKLY]: new TimeFrameConfig('WK', 'H', 3),
        [TimeFrame.MONTHLY]: new TimeFrameConfig('MN', 'VH', 4),
        [TimeFrame.THREE_MONTHLY]: new TimeFrameConfig('TMN', 'T', 5),
        [TimeFrame.SIX_MONTHLY]: new TimeFrameConfig('SMN', 'I', 6),
      } as TimeFrameMap,
      SEQUENCES: {
        // Old name: timeFrameBar
        [SequenceType.MWD]: [TimeFrame.THREE_MONTHLY, TimeFrame.MONTHLY, TimeFrame.WEEKLY, TimeFrame.DAILY],
        [SequenceType.YR]: [TimeFrame.SIX_MONTHLY, TimeFrame.THREE_MONTHLY, TimeFrame.MONTHLY, TimeFrame.WEEKLY],
      } as SequenceMap,
    },
  },

  MISC: {
    RESET_FEED: 'Reset',
  },

  // Exchange and market related constants
  EXCHANGE: {
    TYPES: {
      NSE: 'NSE', // Old Name: NSE_EXCHANGE
    },
  },
});
