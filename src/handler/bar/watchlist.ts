import { BaseBar, IBaseBar } from './base';
import { BarId, BarStatus } from '../../models/bar';
import { BucketSummary, ALL_WATCH_CATEGORIES, WatchCategoryId } from '../../models/watch';
import { IPaintManager } from '../../manager/paint';
import { IFilterManager } from '../../manager/filter';
import { DomainEventType } from '../../models/domain_event';

/**
 * Compact watchlist bar displaying category filter chips.
 *
 * Renders {@link ALL_WATCH_CATEGORIES} as clickable color chips.
 * Left-click applies a color filter, middle-click resets filters,
 * and right-click/contextmenu applies a flag filter.
 *
 * WatchlistBar subscribes directly to its domain refresh events.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IWatchlistBar extends IBaseBar {}

/**
 * Compact watchlist bar displaying category filter chips.
 *
 * Each chip shows the category count, with the category label in metadata. Left-click delegates
 * color filtering to {@link IFilterManager.applyColorFilter}, middle-click
 * delegates reset to {@link IFilterManager.resetFilters}, and contextmenu
 * delegates flag filtering to {@link IFilterManager.applyFlagFilter}.
 *
 * The compact row is rendered inside BaseBar's disclosure toggle; details contain Blacklisted.
 *
 * @see {@link IWatchlistBar} for the public contract.
 */
export class WatchlistBar extends BaseBar<BucketSummary> implements IWatchlistBar {
  /** jQuery event namespace for delegated handlers on the chip selector. */
  private readonly chipEventNs = 'bar-watchlist';

  /**
   * @param paintManager Provides bucket summary data via {@link IPaintManager.summarizeBuckets}.
   * @param filterManager Receives filter and reset operations.
   */
  constructor(
    private readonly paintManager: IPaintManager,
    private readonly filterManager: IFilterManager
  ) {
    super(BarId.WATCHLIST);
  }

  /** The bar owns direct domain-event refresh subscriptions. */
  protected get refreshEvents(): readonly DomainEventType[] {
    return [
      DomainEventType.FIRST_LOAD,
      DomainEventType.WATCHLIST_CHANGED,
      DomainEventType.TICKER_CHANGED,
      DomainEventType.TICKER_TRACKING_STARTED,
      DomainEventType.TICKER_TRACKING_STOPPED,
      DomainEventType.TICKER_METADATA_CHANGED,
      DomainEventType.TICKER_CATEGORY_CHANGED,
      DomainEventType.TICKER_TIMEFRAMES_CHANGED,
    ];
  }

  /** @inheritdoc */
  protected async loadData(): Promise<BucketSummary> {
    return this.paintManager.summarizeBuckets();
  }

  /**
   * Render compact chips for all non-blacklisted watch categories in canonical order.
   * Each chip is a lightweight span with data-color, title, aria-label, and count.
   * DEFAULT_DAILY display count includes uncategorizedCount.
   */
  protected renderCompact(data: BucketSummary): string {
    const chips = ALL_WATCH_CATEGORIES.filter((category) => category.id !== WatchCategoryId.BLACKLISTED)
      .map((category) => {
        const count = data.buckets.get(category.id) ?? 0;
        const displayCount = category.id === WatchCategoryId.DEFAULT_DAILY ? count + data.uncategorizedCount : count;
        return this.renderCategoryChip(category.label, category.color, displayCount);
      })
      .join('');

    return `<span class="${this.bemElement('row')}">${chips}<span class="${this.bemElement(
      'chevron'
    )}" aria-hidden="true">›</span></span>`;
  }

  /** Render the sole expanded detail row for the blacklisted category. */
  protected renderDetails(data: BucketSummary): string {
    const category = ALL_WATCH_CATEGORIES.find((item) => item.id === WatchCategoryId.BLACKLISTED);
    if (!category) {
      return '';
    }

    const count = data.buckets.get(category.id) ?? 0;
    return `<div class="${this.bemElement('details-row')}"><span class="${this.bemElement(
      'details-label'
    )}">${category.label}: </span>${this.renderCategoryChip(category.label, category.color, count)}</div>`;
  }

  /**
   * Resolve bar status from bucket counts.
   *
   * - SET_JOURNAL count 0 → {@link BarStatus.ERROR} (wins when both are zero).
   * - RUNNING count 0 → {@link BarStatus.WARN}.
   * - Otherwise → {@link BarStatus.OK}.
   */
  protected resolveStatus(data: BucketSummary): BarStatus {
    const setJournalCount = data.buckets.get(WatchCategoryId.SET_JOURNAL) ?? 0;
    const runningCount = data.buckets.get(WatchCategoryId.RUNNING) ?? 0;

    if (setJournalCount === 0) {
      return BarStatus.ERROR;
    }
    if (runningCount === 0) {
      return BarStatus.WARN;
    }
    return BarStatus.OK;
  }

  /** Ignore clicks originating from a filter chip; other clicks toggle details. */
  protected onLeftClick(event?: JQuery.ClickEvent): void {
    const target = event?.target as
      | {
          closest?: (selector: string) => unknown;
          matches?: (selector: string) => boolean;
        }
      | undefined;

    if (target?.closest?.('span[data-color]') || target?.matches?.('span[data-color]')) {
      return;
    }

    super.onLeftClick(event);
  }

  /**
   * Bind delegated mousedown and contextmenu handlers on the chip selector,
   * then reapply filters so the active filter chain survives summary repaint.
   *
   * Left mousedown → {@link IFilterManager.applyColorFilter}.
   * Middle mousedown → {@link IFilterManager.resetFilters}.
   * Contextmenu → {@link IFilterManager.applyFlagFilter} with preventDefault/stopPropagation.
   */
  protected onPaint($root: JQuery, _data: BucketSummary): void {
    const chipSelector = 'span[data-color]';

    $root
      .off(`mousedown.${this.chipEventNs}`, chipSelector)
      .on(`mousedown.${this.chipEventNs}`, chipSelector, (event: JQuery.MouseDownEvent) => {
        event.stopPropagation();

        const color = $(event.target).data('color') as string | undefined;
        if (!color) {
          return;
        }

        const originalEvent = event.originalEvent;
        if (!originalEvent) {
          return;
        }

        if (event.which === 2) {
          this.filterManager.resetFilters();
        } else {
          this.filterManager.applyColorFilter(color, originalEvent.shiftKey, originalEvent.ctrlKey);
        }
      });

    $root
      .off(`contextmenu.${this.chipEventNs}`, chipSelector)
      .on(`contextmenu.${this.chipEventNs}`, chipSelector, (event: JQuery.ContextMenuEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const color = $(event.target).data('color') as string | undefined;
        if (!color) {
          return;
        }

        const originalEvent = event.originalEvent;
        if (!originalEvent) {
          return;
        }

        this.filterManager.applyFlagFilter(color, originalEvent.shiftKey);
      });

    this.filterManager.reapplyFilters();
  }

  /** Render a category label/count chip shared by compact and detail output. */
  private renderCategoryChip(label: string, color: string, count: number): string {
    return `<span class="${this.bemElement('chip')}" data-color="${color}" title="${label}: ${count}" aria-label="${label}: ${count}">${count}</span>`;
  }
}
