import { BaseBar, IBaseBar } from './base';
import { Constants } from '../../models/constant';
import { AlertTicker, AlertTickerType } from '../../models/alert_ticker';
import { IDomManager } from '../../manager/dom';
import { IAlertTickerManager } from '../../manager/alert_ticker';
import { IUIUtil } from '../../util/ui';
import { IDomainEventConsumer, ISubscriber } from '../../manager/event_bus';
import { DomainEventType } from '../../models/domain_event';
import { ApiError } from '../../models/api_error';
import { Notifier } from '../../util/notify';

// ── CSS class names (defined in _display.less) ──

const DISPLAY_CLASS = {
  EXPANDED: 'aman-display-expanded',
  EXPANDED_STATE: 'aman-display-expanded-state',
  MAPPED: 'aman-display-mapped',
  UNMAPPED: 'aman-display-unmapped',
  PRIMARY_ROW: 'aman-display-primary',
  SECONDARY_ROW: 'aman-display-secondary',
  ALERT_COUNT: 'aman-display-alert-count',
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
 * Acts as a direct domain-event consumer that refreshes itself
 * when the ticker changes or alert tickers are linked/deleted.
 */
export interface IAlertBar extends IBaseBar<AlertBarData>, IDomainEventConsumer {
  /**
   * Fetch the current ticker's alert data and re-render the bar.
   * On success renders with `isUntracked: false`.
   * On 404 renders empty tickers with `isUntracked: true`.
   * Other errors are rethrown.
   */
  refresh(): Promise<void>;
}

/**
 * Concrete presentation component for the alert bar display card.
 *
 * Renders a compact one-liner showing the ticker status (mapped/unmapped/untracked)
 * with linked-alert count, and expands to show individual alert ticker rows
 * with primary/secondary type indicators.
 *
 * Extends `BaseBar` and uses the `onRootStateUpdate` hook to apply
 * mapped/unmapped root classes without embedding alert-specific logic in BaseBar.
 */
export class AlertBar extends BaseBar<AlertBarData> implements IAlertBar {
  constructor(
    private readonly domManager: IDomManager,
    private readonly alertTickerManager: IAlertTickerManager,
    private readonly uiUtil: IUIUtil
  ) {
    super(`#${Constants.UI.IDS.DISPLAY.CARD}`, {
      expandedClass: DISPLAY_CLASS.EXPANDED_STATE,
      rightSelector: `.${Constants.UI.IDS.DISPLAY.ALERT_TICKER_ROW}`,
    });
  }

  /** @inheritdoc */
  async refresh(): Promise<void> {
    const ticker = this.domManager.getTicker();
    try {
      const alertTickers = await this.alertTickerManager.getAlertTickersForTicker(ticker);
      this.render({ tvTicker: ticker, alertTickers, isUntracked: false });
    } catch (error) {
      if (ApiError.isNotFoundError(error)) {
        this.render({ tvTicker: ticker, alertTickers: [], isUntracked: true });
        return;
      }
      throw error;
    }
  }

  /** @inheritdoc */
  registerEvents(subscriber: ISubscriber): void {
    subscriber.subscribeMany(
      [
        DomainEventType.TICKER_CHANGED,
        DomainEventType.TICKER_TRACKING_STOPPED,
        DomainEventType.ALERT_TICKER_LINKED,
        DomainEventType.ALERT_TICKER_DELETED,
      ],
      async () => {
        await this.refresh();
      }
    );
  }

  /** @inheritdoc */
  protected onRightClick(event: JQuery.ContextMenuEvent): void | Promise<void> {
    const $target = $(event.currentTarget as HTMLElement);
    const symbol = $target.attr(Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_SYMBOL);
    const type = $target.attr(Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_TYPE) as AlertTickerType | undefined;

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

  /** @inheritdoc */
  protected renderCompact(data: AlertBarData): string {
    const primaryTicker = data.alertTickers.find((t) => t.type === 'PRIMARY') ?? null;
    const isMapped = primaryTicker !== null;
    const displayTicker = primaryTicker?.symbol ?? data.tvTicker;
    const alertCount = data.alertTickers.length;

    const statusEmoji = isMapped ? EMOJI.LINKED : EMOJI.UNMAPPED;
    const label = data.isUntracked ? `Untracked · ${displayTicker}` : displayTicker;
    const countHtml = `<span class="${DISPLAY_CLASS.ALERT_COUNT}">${EMOJI.ALERT}${alertCount}</span>`;

    return `${statusEmoji} ${label} · ${countHtml}`;
  }

  /** @inheritdoc */
  protected renderExpanded(data: AlertBarData): string {
    const headerHtml = this.renderCompact(data);
    const rowsHtml = this.buildAlertTickerRows(data);

    return `${headerHtml}<div class="${DISPLAY_CLASS.EXPANDED}">${rowsHtml}</div>`;
  }

  /** @inheritdoc */
  protected onRootStateUpdate($root: JQuery, data: AlertBarData): void {
    const primaryTicker = data.alertTickers.find((t) => t.type === 'PRIMARY') ?? null;
    const isMapped = primaryTicker !== null;

    $root.removeClass(`${DISPLAY_CLASS.MAPPED} ${DISPLAY_CLASS.UNMAPPED}`);
    $root.addClass(isMapped ? DISPLAY_CLASS.MAPPED : DISPLAY_CLASS.UNMAPPED);
  }

  // ── Private rendering ──

  /**
   * Builds HTML for linked alert ticker rows.
   * Primary gets ⭐, secondaries get 🔹.
   * When untracked, shows a special empty-state message.
   *
   * @param data Current bar data.
   * @returns HTML string for alert ticker rows.
   */
  private buildAlertTickerRows(data: AlertBarData): string {
    if (data.alertTickers.length === 0) {
      if (data.isUntracked) {
        return `<div class="${DISPLAY_CLASS.EMPTY_ROW}">${EMOJI.UNMAPPED} Untracked ticker — no backend record</div>`;
      }
      return `<div class="${DISPLAY_CLASS.EMPTY_ROW}">${EMOJI.UNMAPPED} No linked alert tickers</div>`;
    }

    return data.alertTickers.map((t) => this.buildAlertTickerRowDiv(t)).join('');
  }

  /**
   * Builds a single alert ticker row div with data attributes for delink interaction.
   *
   * @param t Alert ticker record.
   * @returns HTML string for a single row.
   */
  private buildAlertTickerRowDiv(t: AlertTicker): string {
    const emoji = t.type === 'PRIMARY' ? EMOJI.PRIMARY : EMOJI.SECONDARY;
    const cls = t.type === 'PRIMARY' ? DISPLAY_CLASS.PRIMARY_ROW : DISPLAY_CLASS.SECONDARY_ROW;
    const exchangeInfo = t.exchange ? ` · ${t.exchange}` : '';
    const nameInfo = t.name ? ` · ${t.name}` : '';

    return `<div class="${cls} ${Constants.UI.IDS.DISPLAY.ALERT_TICKER_ROW}" ${Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_SYMBOL}="${t.symbol}" ${Constants.UI.IDS.DISPLAY.ATTR_ALERT_TICKER_TYPE}="${t.type}">${emoji} ${t.symbol}${exchangeInfo}${nameInfo}</div>`;
  }

  /**
   * Perform the delink operation with success/failure notification.
   *
   * @param symbol Alert ticker symbol to delink.
   * @param ticker Parent TV ticker for the deletion event.
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
