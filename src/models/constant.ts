import { TimeFrameConfig } from './timeframe';

/**
 * Application-wide constants organized by domain and functionality
 */

/** Kohan backend port configuration */
const KOHAN_PORTS = {
  DEV: 9091,
  PROD: 9010,
} as const;
export const Constants = Object.freeze({
  // Audit Configuration
  AUDIT: {
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
      /** Alert Coverage audit plugin - delegates to Kohan backend alert-coverage plugin */
      ALERT_COVERAGE: 'alert-coverage',

      /** GTT unwatched audit plugin & section - identifies and displays unwatched GTT orders */
      GTT_UNWATCHED: 'gtt-unwatched',

      /** Trade risk multiple audit plugin - identifies trades with non-standard risk multiples */
      TRADE_RISK: 'trade-risk',

      /** Stale review audit plugin - identifies tickers not opened within configurable review window */
      STALE_REVIEW: 'stale-review',
    }),
    /** Default page size for backend audit result pagination (10). */
    DEFAULT_SECTION_LIMIT: 10,
  },

  // UI element colors and styles
  UI: {
    POSITIONS: {
      MAIN_LEFT: '64%',
      MAIN_TOP: '6%',
      WRAPPER_WIDTH: '255px',
    },

    COLORS: {
      DEFAULT: 'white',
      HEADER_DEFAULT: 'brown', // Brown fallback for uncategorized ticker in watchlist (header/screener)
      SCREENER_RECENT: 'red', // Recent ticker highlight in screener
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
      },
      DISPLAY: {
        CARD: 'aman-display', // Old Name: displayId (was INPUTS.DISPLAY)
        CARD_CLASS: 'aman-display-card',
        ALERT_TICKER_ROW: 'aman-display-alert-ticker-row',
        ATTR_ALERT_TICKER_SYMBOL: 'data-alert-ticker-symbol',
        ATTR_ALERT_TICKER_TYPE: 'data-alert-ticker-type',
      },
      TIMEFRAME_BAR: {
        CONTAINER: 'aman-tf-bar',
        CHIP_CLASS: 'aman-tf-chip',
        ACTIVE_CLASS: 'aman-tf-active',
        INACTIVE_CLASS: 'aman-tf-inactive',
        LOADING_CLASS: 'aman-tf-loading',
        ATTR_CODE: 'data-tf-code',
      },
      INPUTS: {
        COMMAND: 'aman-input', // Old Name: inputId
      },
      BUTTONS: {
        SEQUENCE: 'aman-seq', // Old Name: seqId
        REFRESH: 'aman-refresh', // Old Name: refreshBtnId
        ALERT_CREATE: 'aman-alert-create', // Old Name: altCreateBtnId
        JOURNAL: 'aman-journal-btn', // Old Name: journalBtnId
        HOOK: 'aman-hook', // Add this line
        AUDIT_GLOBAL_REFRESH: 'aman-audit-global-refresh', // Global refresh button for all audits
        AUDIT_STOP_TRACKING: 'aman-audit-stop-tracking', // Stop tracking button in audit toolbar
        AUDIT_MAP_ALERT: 'aman-audit-map-alert', // Map alert button in audit toolbar
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
    ORDER_PANEL: {
      CLOSE: 'button[data-name="close"]', // Old name: orderPanelCloseSelector
      INPUTS: {
        ENTRY_PRICE: 'input[data-property-id*="EntryPrice"]',
        PROFIT_PRICE: 'input[data-property-id*="ProfitLevelPrice"]',
        STOP_PRICE: 'input[data-property-id*="StopLevelPrice"]',
      },
    },
    // HACK: Use Screener and Watchlist only via TickerArea.
    SCREENER: {
      SYMBOL: 'a.tickerName-GrtoTeat', // Old name: screenerSymbolSelector
      MAIN: '[data-qa-id="screener-widget"]', // Old name: screenerSelector
      LINE: 'tr.row-RdUXZpkv', // Old name: screenerLineSelector
      ITEM: 'tr.row-RdUXZpkv', // Screener item selector for flag painting
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
    JOURNAL: {
      REVIEW_LINK: 'a[href^="/journal/"]',
      CURRENT_TICKER: 'h2.text-3xl',
      REVIEW_TICKER: 'span.font-semibold[x-text="item.ticker"]',
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
      TRADE_INFO: `Trends
HTF - Up
MTF - Up
TTF - Up

Plan: Longs @ TTF DZ

Obstacles:
-

Support:
-`,
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
      WATCHLIST: 'watchlistSilo', // Current TradingView watchlist ticker snapshot
    },
    EVENTS: {
      ALERT_FEED_UPDATE: 'alertFeedEvent', // Old Name: tvWatchChangeEvent
      ALERT_CLICKED: 'alertClickedEvent', // Old Name: alertClickedEvent
      JOURNAL_OPEN: 'journalOpenEvent',
      GTT_REFERSH: 'gttRefereshEvent', // Old Name: gttOrderEvent
      GTT_CREATE: 'gttCreateEvent', // Old Name: gttRequest
      GTT_DELETE: 'gttDeleteEvent',
    },
  },

  // Timeframe configurations
  TIME: {
    // FIXME: Add TimeFrame.YEARLY config ('YR', <style>, 7).
    //       TradingView toolbar supports 12M at index 7 but frontend
    //       does not define TimeFrameConfig for it yet.
    //
    //       Currently configured: SMN(6), TMN(5), MN(4), WK(3), DL(2)
    /** Maps a timeframe code string → TimeFrameConfig. */
    FRAMES_BY_CODE: {
      DL: new TimeFrameConfig('DL', 'I', 2),
      WK: new TimeFrameConfig('WK', 'H', 3),
      MN: new TimeFrameConfig('MN', 'VH', 4),
      TMN: new TimeFrameConfig('TMN', 'T', 5),
      SMN: new TimeFrameConfig('SMN', 'I', 6),
    } as Record<string, TimeFrameConfig>,

    // NOTE: Legacy journal sequence field is derived via
    // timeframeManager.getLegacyJournalSequenceFromTimeframes() in manager/timeframe.ts.
  },

  MISC: {
    RESET_FEED: 'Reset',
  },

  // External service endpoints
  KOHAN: {
    PORTS: KOHAN_PORTS,
    BASE_URL: `http://localhost:${KOHAN_PORTS.DEV}/v1/api`,
    PAGE_LIMIT: 100,
  },

  /** Cache configuration for manager lookups */
  CACHE: {
    CATEGORY: {
      /** Maximum number of entries in the category LRU cache (1000). */
      MAX: 1000,
      /** Time-to-live for cached category entries in ms (5 minutes). */
      TTL_MS: 5 * 60 * 1000,
    },
  },

  // Recent ticker configuration
  RECENT_CUTOFF_MS: 7 * 24 * 60 * 60 * 1000, // 7 days — default "recent" window,

  // Exchange and market related constants
  EXCHANGE: {
    TYPES: {
      NSE: 'NSE', // Old Name: NSE_EXCHANGE
    },
  },
  COMPOSITE: {
    /** Characters that indicate a composite symbol */
    CHARACTERS: ['/', '*', '-', ':'],
    /** Tickers always treated as composite despite lacking separator characters */
    SPECIAL_TICKERS: ['GOLDSILVER', 'BTC.D'],
  },
  FLAGS: {
    /** Substrings that identify a composite ticker as gold-index related */
    GOLD_INDEX_TOKENS: ['XAUUSD', 'GOLDSILVER'],
    /** Ticker types that classify as "Index / Markets" (INDEX flag category) */
    INDEX_TICKER_TYPES: ['INDEX', 'COMMODITY', 'FX', 'BOND'],
  },
});

/**
 * Type for audit plugin IDs - ensures only valid IDs can be used
 */
export type AuditId = (typeof Constants.AUDIT.PLUGINS)[keyof typeof Constants.AUDIT.PLUGINS];
