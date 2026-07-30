import { BaseBar, IBaseBar } from './base';
import { BarId, BarStatus } from '../../models/bar';
import { Alert } from '../../models/alert';
import { IDomManager } from '../../manager/dom';
import { IAlertManager } from '../../manager/alert';
import { ICategoryManager } from '../../manager/category';
import { ITradingViewManager } from '../../manager/tv';
import { DomainEventType } from '../../models/domain_event';
import { WatchCategoryId } from '../../models/watch';
import { Notifier } from '../../util/notify';
import { escapeHtml } from '../../util/html';

// ── Emoji constants ──

const EMOJI = {
  NO_PAIR: '⚠️',
  NO_ALERTS: '🔴',
} as const;

/**
 * Interface for the alert summary bar presentation component.
 * Renders a compact pill display showing alert prices relative to LTP.
 *
 * Extends {@link IBaseBar} which provides `refresh`
 * and `registerEvents` from the BaseBar lifecycle.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IAlertSummaryBar extends IBaseBar {}

/**
 * Compact pill bar showing alert prices relative to TradingView LTP.
 *
 * Renders a compact row of pills: each persisted alert gets a low/high pill
 * based on its price vs LTP, and pending alerts get a pending pill.
 * Supports delegated pill click for alert deletion.
 *
 * Compact-only: does not override {@link renderDetails} so BaseBar renders
 * compact content directly without disclosure shell.
 *
 * Listens to TICKER_CHANGED, ALERTS_CHANGED, TICKER_METADATA_CHANGED,
 * and TICKER_TRACKING_STOPPED to re-render when state changes.
 */
export class AlertSummaryBar extends BaseBar<readonly Alert[] | null> implements IAlertSummaryBar {
  constructor(
    private readonly alertManager: IAlertManager,
    private readonly categoryManager: ICategoryManager,
    private readonly tvManager: ITradingViewManager,
    private readonly domManager: IDomManager
  ) {
    super(BarId.ALERT_SUMMARY);
  }

  // ── Event/data contracts ──

  /** @inheritdoc */
  protected get refreshEvents(): readonly DomainEventType[] {
    return [
      DomainEventType.TICKER_CHANGED,
      DomainEventType.ALERTS_CHANGED,
      DomainEventType.TICKER_METADATA_CHANGED,
      DomainEventType.TICKER_TRACKING_STOPPED,
    ];
  }

  /** @inheritdoc */
  protected async loadData(): Promise<readonly Alert[] | null> {
    const ticker = this.domManager.getTicker();
    try {
      return await this.alertManager.getAlertsForTicker(ticker);
    } catch (error) {
      // Determine if composite to suppress expected warnings
      let isComposite = false;
      try {
        const category = await this.categoryManager.getTickerCategory(ticker);
        isComposite = category.watch?.id === WatchCategoryId.COMPOSITE;
      } catch {
        // Category lookup failed — cannot determine composite, so warn
      }

      if (!isComposite) {
        console.warn(`Failed to load alerts for ${ticker}: ${(error as Error).message}`);
      }

      return null;
    }
  }

  /** @inheritdoc */
  protected resolveStatus(data: readonly Alert[] | null): BarStatus {
    if (data === null || data.length === 0) {
      return BarStatus.ERROR;
    }
    const hasPending = data.some((alert) => alert.id === '');
    return hasPending ? BarStatus.WARN : BarStatus.OK;
  }

  // ── Rendering ──

  /** @inheritdoc */
  protected renderCompact(data: readonly Alert[] | null): string {
    if (data === null) {
      return `<span class="${this.bemElement('no-pair')}">${EMOJI.NO_PAIR} No Pair</span>`;
    }

    if (data.length === 0) {
      return `<span class="${this.bemElement('empty')}">${EMOJI.NO_ALERTS} No Alerts</span>`;
    }

    const ltp = this.tvManager.getLastTradedPrice();
    return data.map((alert, index) => this.buildPill(alert, index, ltp)).join('');
  }

  // ── Post-paint hook — delegated pill clicks ──

  /** @inheritdoc */
  protected onPaint($root: JQuery, data: readonly Alert[] | null): void {
    this.bindPillClicks($root, data);
  }

  // ── Click Binding ──

  /**
   * Binds delegated pill click handler with off/on deduplication.
   * @param $root - jQuery-wrapped bar root element
   * @param data - Current alert data for the click handler closure
   */
  private bindPillClicks($root: JQuery, data: readonly Alert[] | null): void {
    const pillSelector = `[${this.bemDataAttr('index')}]`;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    $root.off('click', pillSelector).on('click', pillSelector, (event: JQuery.ClickEvent) => {
      event.stopPropagation();
      this.handlePillClick(event, data);
    });
  }

  /**
   * Handles click on an alert pill.
   * Deletes persisted alerts, warns for pending alerts, ignores invalid indexes.
   * @param event - The jQuery click event
   * @param data - Current alert data
   */
  private handlePillClick(event: JQuery.ClickEvent, data: readonly Alert[] | null): void {
    if (data === null) {
      return;
    }

    const $target = $(event.currentTarget as HTMLElement);
    const indexStr = $target.attr(this.bemDataAttr('index'));

    if (indexStr === undefined || indexStr === null) {
      return;
    }

    const num = Number(indexStr);
    if (!Number.isInteger(num) || num < 0 || num >= data.length) {
      return;
    }

    const alert = data[num];
    if (alert.id === '') {
      Notifier.warn('Pending alerts cannot be deleted');
      return;
    }

    void this.performDelete(alert);
  }

  /**
   * Delete an alert and show success notification.
   * @param alert - The alert to delete
   */
  private async performDelete(alert: Alert): Promise<void> {
    try {
      await this.alertManager.deleteAlert(alert.id);
      Notifier.red(`❌ Alert deleted: ${alert.price}`);
    } catch (error) {
      Notifier.warn(`Failed to delete alert: ${(error as Error).message}`);
    }
  }

  // ── Markup Builders ──

  /**
   * Builds a single pill button for an alert.
   * Low: price < LTP, High: price >= LTP (persisted), Pending: empty id.
   * @param alert - The alert to render
   * @param index - Zero-based index in the alerts array
   * @param ltp - Current last traded price from TradingView
   */
  private buildPill(alert: Alert, index: number, ltp: number): string {
    const pillClass =
      alert.id === ''
        ? `${this.bemElement('pill')} ${this.bemElementModifier('pill', 'pending')}`
        : alert.price < ltp
          ? `${this.bemElement('pill')} ${this.bemElementModifier('pill', 'low')}`
          : `${this.bemElement('pill')} ${this.bemElementModifier('pill', 'high')}`;

    return `<button type="button" class="${pillClass}" ${this.bemDataAttr('index')}="${index}">${escapeHtml(String(alert.price))}</button>`;
  }
}
