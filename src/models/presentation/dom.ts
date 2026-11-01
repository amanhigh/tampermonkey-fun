/**
 * Ticker visibility filter for DOM queries.
 * Controls which subset of tickers to return from the queried panel.
 */
export enum TickerVisibility {
  /** All tickers in the panel, regardless of visibility. */
  ALL = 'ALL',
  /** Only currently visible (scrolled-into-view) tickers. */
  VISIBLE = 'VISIBLE',
  /** Only actively selected/highlighted tickers. */
  SELECTED = 'SELECTED',
}

/**
 * Unique identifier string for a ticker area (panel).
 */
export type TickerAreaId = 'WATCHLIST' | 'SCREENER';

/**
 * A ticker area (panel) in the TradingView DOM.
 * Carries its own selector behaviour so consumers never need a switch-case.
 */
export interface TickerArea {
  /** Stable identifier used for cache keys and equality checks. */
  readonly id: TickerAreaId;

  /** Row-level CSS selector for all ticker lines in this area. */
  readonly line: string;

  /** Widget/panel presence CSS selector to detect if the area is open. */
  readonly mainSelector: string;

  /** Container CSS selector for the outermost list element (CSS sizing/manipulation). */
  readonly containerSelector: string;

  /**
   * Returns the CSS selector for ticker symbol elements in this area.
   *
   * @param visibility - Controls filtering:
   *   - ALL – raw symbol selector
   *   - VISIBLE – appends `:visible`
   *   - SELECTED – prepends the selected‑item prefix + `:visible`
   */
  getSymbolSelector(visibility: TickerVisibility): string;

  /**
   * Returns the CSS selector for the row/item container in this area.
   */
  getItemSelector(): string;

  /**
   * Returns the CSS selector for flag elements within a ticker row in this area.
   */
  getFlagSelector(): string;
}

// ── Factory ──

/**
 * Named configuration for {@link createTickerArea}.
 * Kept unexported: callers use the {@link TickerArea} singletons instead.
 */
interface TickerAreaConfig {
  /** Stable identifier used for cache keys and equality checks. */
  id: TickerAreaId;
  /** Raw symbol selector for this area. */
  symbol: string;
  /** Prefix selector identifying the selected row. */
  selected: string;
  /** Row/item container selector. */
  item: string;
  /** Flag element selector. */
  flag: string;
  /** Row-level CSS selector for all ticker lines in this area. */
  line: string;
  /** Widget/panel presence CSS selector to detect if the area is open. */
  mainSelector: string;
  /** Container CSS selector for the outermost list element. */
  containerSelector: string;
}

function createTickerArea(config: TickerAreaConfig): TickerArea {
  const { id, symbol, selected, item, flag, line, mainSelector, containerSelector } = config;

  return {
    id,
    line,
    mainSelector,
    containerSelector,
    getSymbolSelector(visibility: TickerVisibility): string {
      switch (visibility) {
        case TickerVisibility.SELECTED:
          return `${selected} ${symbol}:visible`;
        case TickerVisibility.VISIBLE:
          return `${symbol}:visible`;
        default:
          return symbol;
      }
    },
    getItemSelector(): string {
      return item;
    },
    getFlagSelector(): string {
      return flag;
    },
  };
}

// ── Singleton instances ──

export const TickerArea: Readonly<{
  WATCHLIST: TickerArea;
  SCREENER: TickerArea;
}> = {
  /** Main watchlist panel (always present). */
  WATCHLIST: createTickerArea({
    id: 'WATCHLIST',
    symbol: 'span[class*=symbolNameText]',
    selected: 'div[class*=selected]',
    item: 'div[class*=symbol-]',
    flag: 'div[class^=uiMarker]',
    line: 'div[class^=listContainer] > div > div',
    mainSelector: 'div.widgetbar-widgetbody:first',
    containerSelector: 'div[class^=listContainer]',
  }),

  /** Screener panel (may be hidden/closed). */
  SCREENER: createTickerArea({
    id: 'SCREENER',
    symbol: 'a.tickerName-GrtoTeat',
    selected: '.tv-screener-table__result-row--selected',
    item: 'tr.row-RdUXZpkv',
    flag: 'div[class^=uiMarker]',
    line: 'tr.row-RdUXZpkv',
    mainSelector: '[data-qa-id="screener-widget"]',
    containerSelector: '[data-qa-id="screener-widget"]',
  }),
};
