import { ISequenceManager } from '../manager/sequence';
import { IDomManager } from '../manager/dom';
import { IAlertTickerManager } from '../manager/alert_ticker';
import { ILifecycleManager } from '../manager/lifecycle';
import { Constants } from '../models/constant';
import { SequenceType } from '../models/trading';
import { AlertTicker } from '../models/alert_ticker';
import { Notifier } from '../util/notify';

// ── CSS class names (defined in _display.less) ──

const DISPLAY_CLASS = {
  CARD: 'aman-display-card',
  COMPACT: 'aman-display-compact',
  EXPANDED: 'aman-display-expanded',
  MAPPED: 'aman-display-mapped',
  UNMAPPED: 'aman-display-unmapped',
  PRIMARY_ROW: 'aman-display-primary',
  SECONDARY_ROW: 'aman-display-secondary',
  ALERT_COUNT: 'aman-display-alert-count',
  SEQUENCE_CHIP: 'aman-display-sequence',
  TICKER_CHIP: 'aman-display-ticker',
  EMPTY_ROW: 'aman-display-empty',
} as const;

// ── Emoji constants ──

const EMOJI = {
  LINKED: '🔗',
  UNMAPPED: '⚠️',
  PRIMARY: '⭐',
  SECONDARY: '🔹',
  SEQUENCE: '🧭',
  ALERT: '🔔',
} as const;

/**
 * Interface for sequence handling operations
 */
export interface ISequenceHandler {
  /**
   * Handles the sequence switch operation
   */
  handleSequenceSwitch(): Promise<void>;

  /**
   * Displays sequence information in the display area
   */
  displaySequence(): Promise<void>;

  /**
   * Toggles sequence freeze state
   * Uses current sequence when enabling freeze
   */
  toggleFreezeSequence(): Promise<void>;

  /**
   * Starts tracking the current ticker by creating a backend record
   * using the current sequence's timeframes and DOM context.
   */
  startTracking(): Promise<void>;
}

/**
 * Handles sequence operations and display rendering.
 * Manages the compact/expanded display card that shows ticker, sequence,
 * and linked alert ticker information.
 */
export class SequenceHandler implements ISequenceHandler {
  // Expanded state (minimal UI state, not a data cache)
  private displayExpanded = false;

  constructor(
    private readonly sequenceManager: ISequenceManager,
    private readonly domManager: IDomManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly lifecycleManager: ILifecycleManager
  ) {}

  /** @inheritdoc */
  async handleSequenceSwitch(): Promise<void> {
    await this.sequenceManager.flipSequence();
    // Reset to compact on sequence switch
    this.displayExpanded = false;
    await this.displaySequence();
  }

  /** @inheritdoc */
  async displaySequence(): Promise<void> {
    const sequence = await this.sequenceManager.getCurrentSequence();
    const tvTicker = this.domManager.getTicker();
    const alertTickers = await this.alertTickerManager.getAlertTickersForTicker(tvTicker);

    // Store on DOM element for toggle re-render (avoids handler-level cache)
    $(`#${Constants.UI.IDS.DISPLAY.CARD}`).data('displayData', { sequence, tvTicker, alertTickers });

    this.renderDisplay();
  }

  // ── Display Rendering ──

  /**
   * Renders the display area using data stored on the DOM element and current expanded state.
   */
  private renderDisplay(): void {
    const $card = $(`#${Constants.UI.IDS.DISPLAY.CARD}`);
    const data = $card.data('displayData') as
      | { sequence: SequenceType; tvTicker: string; alertTickers: AlertTicker[] }
      | undefined;
    if (!data) {
      return;
    }

    const { sequence, tvTicker, alertTickers } = data;
    const primaryTicker = alertTickers.find((t) => t.type === 'PRIMARY') ?? null;
    const isMapped = primaryTicker !== null;
    const displayTicker = primaryTicker?.symbol ?? tvTicker;

    // Update mapped/unmapped state class
    $card.removeClass(`${DISPLAY_CLASS.MAPPED} ${DISPLAY_CLASS.UNMAPPED}`);
    $card.addClass(isMapped ? DISPLAY_CLASS.MAPPED : DISPLAY_CLASS.UNMAPPED);

    if (this.displayExpanded) {
      $card.html(this.buildExpandedHtml(sequence, displayTicker, isMapped, alertTickers));
    } else {
      $card.html(this.buildCompactHtml(sequence, displayTicker, isMapped, alertTickers.length));
    }

    // Attach click handler (remove previous first to avoid duplicates)
    $card.off('click').on('click', () => this.toggleDisplay());
  }

  /**
   * Builds compact mode HTML.
   * Format: 🔗 INFY · 🧭 MWD · 🔔2
   */
  private buildCompactHtml(
    sequence: SequenceType,
    displayTicker: string,
    isMapped: boolean,
    alertCount: number
  ): string {
    const statusEmoji = isMapped ? EMOJI.LINKED : EMOJI.UNMAPPED;
    const sequenceHtml = `<span class="${DISPLAY_CLASS.SEQUENCE_CHIP}">${EMOJI.SEQUENCE} ${sequence}</span>`;
    const tickerHtml = `<span class="${DISPLAY_CLASS.TICKER_CHIP}">${displayTicker}</span>`;
    const countHtml = `<span class="${DISPLAY_CLASS.ALERT_COUNT}">${EMOJI.ALERT}${alertCount}</span>`;

    return `${statusEmoji} ${tickerHtml} · ${sequenceHtml} · ${countHtml}`;
  }

  /**
   * Builds expanded mode HTML.
   * Compact header + linked ticker rows.
   */
  private buildExpandedHtml(
    sequence: SequenceType,
    displayTicker: string,
    isMapped: boolean,
    alertTickers: AlertTicker[]
  ): string {
    // Compact header at top
    const headerHtml = this.buildCompactHtml(sequence, displayTicker, isMapped, alertTickers.length);

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

    return alertTickers
      .map((t) => {
        const emoji = t.type === 'PRIMARY' ? EMOJI.PRIMARY : EMOJI.SECONDARY;
        const cls = t.type === 'PRIMARY' ? DISPLAY_CLASS.PRIMARY_ROW : DISPLAY_CLASS.SECONDARY_ROW;
        const exchangeInfo = t.exchange ? ` · ${t.exchange}` : '';
        const nameInfo = t.name ? ` · ${t.name}` : '';
        return `<div class="${cls}">${emoji} ${t.symbol}${exchangeInfo}${nameInfo}</div>`;
      })
      .join('');
  }

  /**
   * Toggles between compact and expanded display modes.
   */
  private toggleDisplay(): void {
    this.displayExpanded = !this.displayExpanded;
    this.renderDisplay();
  }

  /** @inheritdoc */
  async toggleFreezeSequence(): Promise<void> {
    await this.sequenceManager.toggleFreezeSequence();
  }

  /** @inheritdoc */
  async startTracking(): Promise<void> {
    const ticker = this.domManager.getTicker();
    const exchange = this.domManager.getCurrentExchange();
    const sequence = await this.sequenceManager.getCurrentSequence();
    const timeframes = Constants.TIME.SEQUENCE_TYPES.TO_TIMEFRAMES[sequence];

    try {
      await this.lifecycleManager.startTracking({
        ticker,
        exchange,
        timeframes,
        type: 'EQUITY',
        state: 'WATCHED',
        trend: 'SIDEWAYS',
        last_opened_at: new Date().toISOString(),
      });
      Notifier.success(`⏺ Started tracking ${ticker}`);
    } catch (error) {
      Notifier.warn(`Failed to start tracking ${ticker}: ${(error as Error).message}`);
    }
  }
}
