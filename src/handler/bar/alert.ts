import { BaseBar, IBaseBar } from './base';
import { BarId } from '../../models/bar';
import { AlertTicker, AlertTickerType } from '../../models/alert_ticker';
import { IDomManager } from '../../manager/dom';
import { IAlertTickerManager } from '../../manager/alert_ticker';
import { IUIUtil } from '../../util/ui';
import { DomainEventType } from '../../models/domain_event';
import { ApiError } from '../../models/api_error';
import { Notifier } from '../../util/notify';
import { escapeHtml } from '../../util/html';

// ── Emoji constants ──

const EMOJI = {
  LINKED: '🔗',
  UNMAPPED: '⚠️',
  PRIMARY: '⭐',
  SECONDARY: '🔹',
  ALERT: '🔔',
} as const;

/**
 * Data required to render the alert bar display card.
 */
export interface AlertBarData {
  /** Current TradingView ticker symbol. */
  readonly tvTicker: string;
  /** Linked alert tickers for the current ticker. */
  readonly alertTickers: readonly AlertTicker[];
  /** Whether the ticker is untracked (no backend record). */
  readonly isUntracked: boolean;
}

/**
 * Interface for the alert bar presentation component.
 * Renders the compact/expanded display card showing ticker status
 * and linked alert ticker information.
 *
 * Extends {@link IBaseBar} which provides `render`, `refresh`,
 * and `registerEvents` from the BaseBar lifecycle.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IAlertBar extends IBaseBar<AlertBarData> {}

/**
 * Reference BaseBar implementation for the alert bar display card.
 *
 * Renders a compact one-liner showing the ticker status (mapped/unmapped/untracked)
 * with linked-alert count, and expands to show individual alert ticker rows
 * with primary/secondary type indicators.
 *
 * Uses {@link onPaint} to apply mapped/unmapped root classes after each paint cycle.
 */
export class AlertBar extends BaseBar<AlertBarData> implements IAlertBar {
  constructor(
    private readonly domManager: IDomManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly uiUtil: IUIUtil
  ) {
    super(BarId.ALERT);
  }

  // ── Event/data contracts ──

  /** @inheritdoc */
  protected get refreshEvents(): readonly DomainEventType[] {
    return [
      DomainEventType.TICKER_CHANGED,
      DomainEventType.TICKER_TRACKING_STOPPED,
      DomainEventType.ALERT_TICKER_LINKED,
      DomainEventType.ALERT_TICKER_DELETED,
    ];
  }

  /** @inheritdoc */
  protected async loadData(): Promise<AlertBarData> {
    const ticker = this.domManager.getTicker();
    try {
      const alertTickers = await this.alertTickerManager.getAlertTickersForTicker(ticker);
      return { tvTicker: ticker, alertTickers, isUntracked: false };
    } catch (error) {
      if (ApiError.isNotFoundError(error)) {
        return { tvTicker: ticker, alertTickers: [], isUntracked: true };
      }
      throw error;
    }
  }

  // ── Context-menu delink ──

  /** @inheritdoc */
  protected onRightClick(event: JQuery.ContextMenuEvent, _data: AlertBarData): void | Promise<void> {
    const $target = $(event.currentTarget as HTMLElement);
    const symbol = $target.attr(this.bemDataAttr('symbol'));
    const type = $target.attr(this.bemDataAttr('type')) as AlertTickerType | undefined;

    if (!symbol || (type !== 'PRIMARY' && type !== 'SECONDARY')) {
      return;
    }

    const isPrimary = type === 'PRIMARY';
    const confirmText = isPrimary
      ? `Delink PRIMARY ${symbol}? This ticker will be unmapped until you map a new primary.`
      : `Delink ${symbol}?`;

    if (!this.uiUtil.showConfirm(confirmText)) {
      return;
    }

    const ticker = this.domManager.getTicker();

    return this.performDelink(symbol, ticker);
  }

  // ── Rendering ──

  /** @inheritdoc */
  protected renderCompact(data: AlertBarData): string {
    const primaryTicker = data.alertTickers.find((t) => t.type === 'PRIMARY') ?? null;
    const isMapped = primaryTicker !== null;
    const displayTicker = primaryTicker?.symbol ?? data.tvTicker;
    const alertCount = data.alertTickers.length;

    const statusEmoji = isMapped ? EMOJI.LINKED : EMOJI.UNMAPPED;
    const label = data.isUntracked ? `Untracked · ${escapeHtml(displayTicker)}` : escapeHtml(displayTicker);
    const countHtml = `<span class="${this.bemElement('count')}">${EMOJI.ALERT}${alertCount}</span>`;

    return `${statusEmoji} ${label} · ${countHtml}`;
  }

  /** @inheritdoc */
  protected renderExpanded(data: AlertBarData): string {
    const headerHtml = this.renderCompact(data);
    const rowsHtml = this.buildAlertTickerRows(data);

    return `${headerHtml}<div class="${this.bemElement('details')}">${rowsHtml}</div>`;
  }

  /** @inheritdoc */
  protected onPaint($root: JQuery, data: AlertBarData): void {
    const primaryTicker = data.alertTickers.find((t) => t.type === 'PRIMARY') ?? null;
    const isMapped = primaryTicker !== null;

    $root.removeClass(`${this.bemModifier('mapped')} ${this.bemModifier('unmapped')}`);
    $root.addClass(isMapped ? this.bemModifier('mapped') : this.bemModifier('unmapped'));
  }

  // ── Private rendering ──

  /**
   * Builds HTML for linked alert ticker rows.
   * Primary gets ⭐, secondaries get 🔹.
   * When untracked, shows a special empty-state message.
   */
  private buildAlertTickerRows(data: AlertBarData): string {
    if (data.alertTickers.length === 0) {
      if (data.isUntracked) {
        return `<div class="${this.bemElement('empty')}">${EMOJI.UNMAPPED} Untracked ticker — no backend record</div>`;
      }
      return `<div class="${this.bemElement('empty')}">${EMOJI.UNMAPPED} No linked alert tickers</div>`;
    }

    return data.alertTickers.map((t) => this.buildAlertTickerRowDiv(t)).join('');
  }

  /**
   * Builds a single alert ticker row div with data attributes for delink interaction.
   */
  private buildAlertTickerRowDiv(t: AlertTicker): string {
    const emoji = t.type === 'PRIMARY' ? EMOJI.PRIMARY : EMOJI.SECONDARY;
    const mod = t.type === 'PRIMARY' ? 'primary' : 'secondary';
    const rowClass = `${this.bemElement('row')} ${this.bemElementModifier('row', mod)}`;
    const exchangeInfo = t.exchange ? ` · ${escapeHtml(t.exchange)}` : '';
    const nameInfo = t.name ? ` · ${escapeHtml(t.name)}` : '';

    return `<div class="${rowClass}" ${this.bemDataAttr('symbol')}="${escapeHtml(t.symbol)}" ${this.bemDataAttr('type')}="${t.type}" ${this.bemDataAttr('context-action')}>${emoji} ${escapeHtml(t.symbol)}${exchangeInfo}${nameInfo}</div>`;
  }

  /**
   * Perform the delink operation with success/failure notification.
   */
  private async performDelink(symbol: string, ticker: string): Promise<void> {
    try {
      await this.alertTickerManager.deleteAlertTicker(symbol, ticker);
      Notifier.success(`⏹ Delinked ${symbol}`);
    } catch (error) {
      Notifier.warn(`Failed to delink ${symbol}: ${(error as Error).message}`);
    }
  }
}
