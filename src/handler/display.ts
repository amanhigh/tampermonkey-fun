import { ITimeFrameManager } from '../manager/timeframe';
import { IDomManager } from '../manager/dom';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { Constants } from '../models/constant';
import { TimeFrameCode } from '../models/timeframe';
import { AlertTicker } from '../models/alert_ticker';

// ── CSS class names (defined in _display.less) ──

const DISPLAY_CLASS = {
  CARD: 'aman-display-card',
  COMPACT: 'aman-display-compact',
  EXPANDED: 'aman-display-expanded',
  EXPANDED_STATE: 'aman-display-expanded-state',
  MAPPED: 'aman-display-mapped',
  UNMAPPED: 'aman-display-unmapped',
  PRIMARY_ROW: 'aman-display-primary',
  SECONDARY_ROW: 'aman-display-secondary',
  ALERT_COUNT: 'aman-display-alert-count',
  TIMEFRAME_CHIP: 'aman-display-timeframe',
  TICKER_CHIP: 'aman-display-ticker',
  EMPTY_ROW: 'aman-display-empty',
} as const;

// ── Emoji constants ──

const EMOJI = {
  LINKED: '🔗',
  UNMAPPED: '⚠️',
  PRIMARY: '⭐',
  SECONDARY: '🔹',
  TIMEFRAMES: '🧭',
  ALERT: '🔔',
} as const;

/**
 * Interface for display area operations.
 * Owns the compact/expanded display card that shows ticker, allowed timeframes,
 * and linked alert ticker information.
 */
export interface IDisplayHandler {
  /**
   * Fetches current ticker data and renders the display card.
   * Always starts in compact mode on fresh data fetch.
   */
  display(): Promise<void>;
}

/**
 * Handles display area rendering.
 * Manages the compact/expanded display card that shows ticker, allowed timeframes,
 * and linked alert ticker information.
 */
// FIXME: Extract BaseBar with shared expand/collapse logic that DisplayHandler,
//        AlertSummaryHandler, and future bars can compose or extend.
export class DisplayHandler implements IDisplayHandler {
  // Expanded state (minimal UI state, not a data cache)
  private displayExpanded = false;

  constructor(
    private readonly timeFrameManager: ITimeFrameManager,
    private readonly domManager: IDomManager,
    private readonly alertTickerManager: IAlertTickerManager
  ) {}

  /** @inheritdoc */
  async display(): Promise<void> {
    this.displayExpanded = false;
    const timeframes = await this.timeFrameManager.getAllowedTimeframesForCurrentTicker();
    const tvTicker = this.domManager.getTicker();
    const alertTickers = await this.alertTickerManager.getAlertTickersForTicker(tvTicker);

    // Store on DOM element for toggle re-render (avoids handler-level cache)
    $(`#${Constants.UI.IDS.DISPLAY.CARD}`).data('displayData', { timeframes, tvTicker, alertTickers });

    this.renderDisplay();
  }

  // ── Display Rendering ──

  /**
   * Renders the display area using data stored on the DOM element and current expanded state.
   */
  private renderDisplay(): void {
    const $card = $(`#${Constants.UI.IDS.DISPLAY.CARD}`);
    const data = $card.data('displayData') as
      | { timeframes: TimeFrameCode[]; tvTicker: string; alertTickers: AlertTicker[] }
      | undefined;
    if (!data) {
      return;
    }

    const { timeframes, tvTicker, alertTickers } = data;
    const primaryTicker = alertTickers.find((t) => t.type === 'PRIMARY') ?? null;
    const isMapped = primaryTicker !== null;
    const displayTicker = primaryTicker?.symbol ?? tvTicker;

    // Update mapped/unmapped state class
    $card.removeClass(`${DISPLAY_CLASS.MAPPED} ${DISPLAY_CLASS.UNMAPPED}`);
    $card.addClass(isMapped ? DISPLAY_CLASS.MAPPED : DISPLAY_CLASS.UNMAPPED);

    // Toggle expanded-state class for width change
    $card.toggleClass(DISPLAY_CLASS.EXPANDED_STATE, this.displayExpanded);

    if (this.displayExpanded) {
      $card.html(this.buildExpandedHtml(timeframes, displayTicker, isMapped, alertTickers));
    } else {
      $card.html(this.buildCompactHtml(timeframes, displayTicker, isMapped, alertTickers.length));
    }

    // Attach click handler (remove previous first to avoid duplicates)
    $card.off('click').on('click', () => this.toggleDisplay());
  }

  /**
   * Builds compact mode HTML.
   * Format: 🔗 INFY · 🧭 TMN MN WK DL · 🔔2
   */
  private buildCompactHtml(
    timeframes: TimeFrameCode[],
    displayTicker: string,
    isMapped: boolean,
    alertCount: number
  ): string {
    const statusEmoji = isMapped ? EMOJI.LINKED : EMOJI.UNMAPPED;
    const tfHtml = `<span class="${DISPLAY_CLASS.TIMEFRAME_CHIP}">${EMOJI.TIMEFRAMES} ${timeframes.join(' ')}</span>`;
    const tickerHtml = `<span class="${DISPLAY_CLASS.TICKER_CHIP}">${displayTicker}</span>`;
    const countHtml = `<span class="${DISPLAY_CLASS.ALERT_COUNT}">${EMOJI.ALERT}${alertCount}</span>`;

    return `${statusEmoji} ${tickerHtml} · ${tfHtml} · ${countHtml}`;
  }

  /**
   * Builds expanded mode HTML.
   * Compact header + linked ticker rows.
   */
  private buildExpandedHtml(
    timeframes: TimeFrameCode[],
    displayTicker: string,
    isMapped: boolean,
    alertTickers: AlertTicker[]
  ): string {
    // Compact header at top
    const headerHtml = this.buildCompactHtml(timeframes, displayTicker, isMapped, alertTickers.length);

    // Alert ticker rows
    const rowsHtml = this.buildAlertTickerRows(alertTickers);

    return `${headerHtml}<div class="${DISPLAY_CLASS.EXPANDED}">${rowsHtml}</div>`;
  }

  /**
   * Builds HTML for linked alert ticker rows.
   * Primary gets ⭐, secondaries get 🔹.
   */
  private buildAlertTickerRows(alertTickers: AlertTicker[]): string {
    if (alertTickers.length === 0) {
      return `<div class="${DISPLAY_CLASS.EMPTY_ROW}">${EMOJI.UNMAPPED} No linked alert tickers</div>`;
    }

    return alertTickers.map((t) => this.buildAlertTickerRowDiv(t)).join('');
  }

  /**
   * Builds a single alert ticker row div with data attributes for delink interaction.
   */
  private buildAlertTickerRowDiv(t: AlertTicker): string {
    const emoji = t.type === 'PRIMARY' ? EMOJI.PRIMARY : EMOJI.SECONDARY;
    const cls = t.type === 'PRIMARY' ? DISPLAY_CLASS.PRIMARY_ROW : DISPLAY_CLASS.SECONDARY_ROW;
    const exchangeInfo = t.exchange ? ` · ${t.exchange}` : '';
    const nameInfo = t.name ? ` · ${t.name}` : '';
    return `<div class="${cls} ${Constants.UI.IDS.DISPLAY.ALERT_TICKER_ROW}" ${Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_SYMBOL}="${t.symbol}" ${Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_TYPE}="${t.type}">${emoji} ${t.symbol}${exchangeInfo}${nameInfo}</div>`;
  }

  /**
   * Toggles between compact and expanded display modes.
   */
  private toggleDisplay(): void {
    this.displayExpanded = !this.displayExpanded;
    this.renderDisplay();
  }
}
