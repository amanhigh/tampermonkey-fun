import { IDomManager } from '../manager/dom';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { Constants } from '../models/constant';
import { AlertTicker } from '../models/alert_ticker';
import { IDomainEventConsumer, ISubscriber } from '../manager/event_bus';
import { DomainEventType } from '../models/domain_event';
import { ApiError } from '../models/api_error';

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
  TICKER_CHIP: 'aman-display-ticker',
  EMPTY_ROW: 'aman-display-empty',
} as const;

// ── Emoji constants ──

const EMOJI = {
  LINKED: '🔗',
  UNMAPPED: '⚠️',
  PRIMARY: '⭐',
  SECONDARY: '🔹',
  ALERT: '🔔',
} as const;

/**
 * Interface for display area operations.
 * Owns the compact/expanded display card that shows ticker status
 * and linked alert ticker information. Timeframes are shown in the
 * dedicated timeframe bar below this card.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IDisplayHandler extends IDomainEventConsumer {}

/**
 * Handles display area rendering.
 * Manages the compact/expanded display card that shows ticker status
 * and linked alert ticker information.
 */
// FIXME: Extract BaseBar with shared expand/collapse logic that DisplayHandler,
//        AlertSummaryHandler, and future bars can compose or extend.
export class DisplayHandler implements IDisplayHandler {
  // Expanded state (minimal UI state, not a data cache)
  private displayExpanded = false;

  constructor(
    private readonly domManager: IDomManager,
    private readonly alertTickerManager: IAlertTickerManager
  ) {}

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    // BUG: TICKER_TRACKING_STOPPED not subscribed — display stays stale after stop-tracking.
    subscriber.subscribe(DomainEventType.TICKER_CHANGED, async () => {
      await this.display();
    });
    subscriber.subscribeMany([DomainEventType.ALERT_TICKER_LINKED, DomainEventType.ALERT_TICKER_DELETED], async () => {
      await this.display();
    });
  }

  /**
   * Fetches current ticker data and renders the display card.
   * Always starts in compact mode on fresh data fetch.
   * Consumers should drive re-renders via TICKER_CHANGED and
   * ALERT_TICKER_LINKED/ALERT_TICKER_DELETED events.
   */
  async display(): Promise<void> {
    this.displayExpanded = false;
    const tvTicker = this.domManager.getTicker();

    let alertTickers: AlertTicker[] = [];
    let isUntracked = false;
    try {
      alertTickers = await this.alertTickerManager.getAlertTickersForTicker(tvTicker);
    } catch (error) {
      // Backend 404 "Ticker not found" — expected for untracked tickers
      // Treat as empty alert-ticker list with untracked flag
      if (ApiError.isNotFoundError(error)) {
        isUntracked = true;
      } else {
        throw error;
      }
    }

    // Store on DOM element for toggle re-render (avoids handler-level cache)
    $(`#${Constants.UI.IDS.DISPLAY.CARD}`).data('displayData', { tvTicker, alertTickers, isUntracked });

    // FIXME: Show last visited day in display area (e.g. "7d")
    this.renderDisplay();
  }

  // ── Display Rendering ──

  /**
   * Renders the display area using data stored on the DOM element and current expanded state.
   */
  private renderDisplay(): void {
    const $card = $(`#${Constants.UI.IDS.DISPLAY.CARD}`);
    const data = $card.data('displayData') as
      | { tvTicker: string; alertTickers: AlertTicker[]; isUntracked?: boolean }
      | undefined;
    if (!data) {
      return;
    }

    const { tvTicker, alertTickers, isUntracked } = data;
    const primaryTicker = alertTickers.find((t) => t.type === 'PRIMARY') ?? null;
    const isMapped = primaryTicker !== null;
    const displayTicker = primaryTicker?.symbol ?? tvTicker;

    // Update mapped/unmapped state class
    $card.removeClass(`${DISPLAY_CLASS.MAPPED} ${DISPLAY_CLASS.UNMAPPED}`);
    $card.addClass(isMapped ? DISPLAY_CLASS.MAPPED : DISPLAY_CLASS.UNMAPPED);

    // Toggle expanded-state class for width change
    $card.toggleClass(DISPLAY_CLASS.EXPANDED_STATE, this.displayExpanded);

    if (this.displayExpanded) {
      $card.html(this.buildExpandedHtml(displayTicker, isMapped, alertTickers, isUntracked));
    } else {
      $card.html(this.buildCompactHtml(displayTicker, isMapped, alertTickers.length, isUntracked));
    }

    // Attach click handler (remove previous first to avoid duplicates)
    $card.off('click').on('click', () => this.toggleDisplay());
  }

  /**
   * Builds compact mode HTML.
   * Format: 🔗 INFY · 🔔2    (mapped)
   *         ⚠️ Untracked · BHEL  (untracked)
   *         ⚠️ BHEL · 🔔0       (unmapped but not untracked)
   */
  private buildCompactHtml(displayTicker: string, isMapped: boolean, alertCount: number, isUntracked = false): string {
    const statusEmoji = isMapped ? EMOJI.LINKED : EMOJI.UNMAPPED;
    const label = isUntracked ? `Untracked · ${displayTicker}` : displayTicker;
    const countHtml = `<span class="${DISPLAY_CLASS.ALERT_COUNT}">${EMOJI.ALERT}${alertCount}</span>`;

    return `${statusEmoji} ${label} · ${countHtml}`;
  }

  /**
   * Builds expanded mode HTML.
   * Compact header + linked ticker rows.
   */
  private buildExpandedHtml(
    displayTicker: string,
    isMapped: boolean,
    alertTickers: AlertTicker[],
    isUntracked = false
  ): string {
    // Compact header at top
    const headerHtml = this.buildCompactHtml(displayTicker, isMapped, alertTickers.length, isUntracked);

    // Alert ticker rows
    const rowsHtml = this.buildAlertTickerRows(alertTickers, isUntracked);

    return `${headerHtml}<div class="${DISPLAY_CLASS.EXPANDED}">${rowsHtml}</div>`;
  }

  /**
   * Builds HTML for linked alert ticker rows.
   * Primary gets ⭐, secondaries get 🔹.
   * When untracked, shows a special empty-state message.
   */
  private buildAlertTickerRows(alertTickers: AlertTicker[], isUntracked = false): string {
    if (alertTickers.length === 0) {
      if (isUntracked) {
        return `<div class="${DISPLAY_CLASS.EMPTY_ROW}">${EMOJI.UNMAPPED} Untracked ticker — no backend record</div>`;
      }
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
