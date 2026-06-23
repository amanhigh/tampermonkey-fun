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

function createTickerArea(
  id: TickerAreaId,
  symbol: string,
  selected: string,
  item: string,
  flag: string,
  line: string,
  mainSelector: string,
  containerSelector: string
): TickerArea {
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
  WATCHLIST: createTickerArea(
    'WATCHLIST',
    'span[class*=symbolNameText]',
    'div[class*=selected]',
    'div[class*=symbol-]',
    'div[class^=uiMarker]',
    'div[class^=listContainer] > div > div',
    'div.widgetbar-widgetbody:first',
    'div[class^=listContainer]'
  ),

  /** Screener panel (may be hidden/closed). */
  SCREENER: createTickerArea(
    'SCREENER',
    'a.tickerName-GrtoTeat',
    '.tv-screener-table__result-row--selected',
    'tr.row-RdUXZpkv',
    'div[class^=uiMarker]',
    'tr.row-RdUXZpkv',
    '[data-qa-id="screener-widget"]',
    '[data-qa-id="screener-widget"]'
  ),
};
