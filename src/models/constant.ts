import { SequenceMap, SequenceType, TimeFrameConfig, TimeFrame, TimeFrameMap } from './trading';

/**
 * Application-wide constants organized by domain and functionality
 */
export const Constants = Object.freeze({
  // Audit Configuration
  AUDIT: {
    IDS: {
      AREA: 'aman-audit', // Audit area container
      GLOBAL_REFRESH_BUTTON: 'aman-audit-global-refresh', // Global refresh button for all audits
    },
    CLASSES: {
      SECTION: 'aman-audit-section', // Main audit section container
      STATUS_PASS: 'audit-status-pass', // When no issues found
      STATUS_WARN: 'audit-status-warn', // When issues found
      SECTION_HEADER: 'audit-section-header', // Section header
      SECTION_BODY: 'audit-section-body', // Section body with results
      SECTION_REFRESH: 'audit-section-refresh', // Refresh button in section
      HEADER_ICON: 'header-icon', // Expand/collapse icon
      HEADER_TEXT: 'header-text', // Header text with timestamp
    },
    PLUGINS: Object.freeze({
      /** Alerts audit plugin - analyzes trading alerts */
      ALERTS: 'alerts',

      /** Orphan alerts audit plugin - identifies alerts without corresponding pairs */
      ORPHAN_ALERTS: 'orphan-alerts',

      /** ReverseGolden Integrity audit plugin (FR-007) - ensures every investingTicker in PairRepo has a corresponding tvTicker in TickerRepo */
      REVERSE_GOLDEN: 'reverse-golden',

      /** Golden Integrity audit plugin (FR-008) - ensures every tvTicker in TickerRepo resolves to an investingTicker present in PairRepo */
      GOLDEN: 'golden',

      /** GTT unwatched audit plugin & section - identifies and displays unwatched GTT orders */
      GTT_UNWATCHED: 'gtt-unwatched',

      /** Orphan sequences audit plugin - identifies sequence entries without corresponding tickers */
      ORPHAN_SEQUENCES: 'orphan-sequences',

      /** Orphan flags audit plugin - identifies flag entries without corresponding tickers */
      ORPHAN_FLAGS: 'orphan-flags',

      /** Orphan exchange audit plugin - identifies exchange mappings without corresponding tickers */
      ORPHAN_EXCHANGE: 'orphan-exchange',

      /** Duplicate pair IDs audit plugin - identifies multiple investing tickers sharing the same pairId */
      DUPLICATE_PAIR_IDS: 'duplicate-pair-ids',

      /** Ticker collision audit plugin - identifies reverse map collisions in TickerRepo */
      TICKER_COLLISION: 'ticker-collision',

      /** Trade risk multiple audit plugin - identifies trades with non-standard risk multiples */
      TRADE_RISK: 'trade-risk',

      /** Stale review audit plugin - identifies tickers not opened within configurable review window */
      STALE_REVIEW: 'stale-review',
    }),
    STALE_REVIEW_THRESHOLD_DAYS: 90,
  },

  // UI element colors and styles
  UI: {
    COLORS: {
      LIST: ['orange', 'red', 'dodgerblue', 'cyan', 'lime', 'white', 'brown', 'darkkhaki'], // Old name: colorList
      DEFAULT: 'white',
      FNO_CSS: { 'border-top-style': 'groove', 'border-width': 'medium' }, // Old name: fnoCss
      // Severity colors for audit results
      SEVERITY: {
        LOW: 'darkgray', // Low severity - informational
        MEDIUM: 'darkorange', // Medium severity - needs attention
        HIGH: 'darkred', // High severity - critical issues
      } as const,
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
        AUDIT_GLOBAL_REFRESH: 'aman-audit-global-refresh', // Global refresh button for all audits
      },
      CHECKBOXES: {
        SWIFT: 'aman-swift', // Old Name: swiftId
      },
    },
  },

  // DOM Selectors for TradingView components
  DOM: {
    BASIC: {
      NAME: 'div[class*=mainTitle][class*=withAction]', // For main title element (company name only, excludes EMA/Aman labels)
      TICKER: '#header-toolbar-symbol-search span[class^="value"]', // For ticker display (changed from > div to span[class^="value"])
      EXCHANGE: 'div[class*=exchangeTitle]', // For exchange name
      LTP: 'div[data-test-id-value-title="C"] > div[class^=valueValue]', // For last traded price (closing price from legend)
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
      SYMBOL: 'a.tickerName-GrtoTeat', // Old name: screenerSymbolSelector
      MAIN: '[data-qa-id="screener-widget"]', // Old name: screenerSelector
      LINE: 'tr.row-RdUXZpkv', // Old name: screenerLineSelector
      ITEM: 'tr.row-RdUXZpkv', // Screener item selector for flag painting
      BUTTON: 'button[data-name=toggle-visibility-button]', // Old name: screenerButtonSelector
      SELECTED: '.tv-screener-table__result-row--selected', // Old name: screenerSelectedSelector
      PERSISTENT_PARENT: '.buttons-dA6R3Y1X', // Persistent parent for observer
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
      RISK_TOLERANCE: 0.01, // ±1% rounding tolerance for risk multiple validation
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

/**
 * Type for audit plugin IDs - ensures only valid IDs can be used
 */
export type AuditId = (typeof Constants.AUDIT.PLUGINS)[keyof typeof Constants.AUDIT.PLUGINS];
