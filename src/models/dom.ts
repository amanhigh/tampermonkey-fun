import { Constants } from './constant';

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
}

// ── Factory ──

function createTickerArea(id: TickerAreaId, symbol: string, selected: string, item: string): TickerArea {
  return {
    id,
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
    Constants.DOM.WATCHLIST.SYMBOL,
    Constants.DOM.WATCHLIST.SELECTED,
    Constants.DOM.WATCHLIST.ITEM
  ),

  /** Screener panel (may be hidden/closed). */
  SCREENER: createTickerArea(
    'SCREENER',
    Constants.DOM.SCREENER.SYMBOL,
    Constants.DOM.SCREENER.SELECTED,
    Constants.DOM.SCREENER.ITEM
  ),
};
