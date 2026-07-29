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
 * The bar does not auto-subscribe to domain events; the parent
 * WatchListHandler explicitly calls {@link refresh} after painting.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IWatchlistBar extends IBaseBar {}

/**
 * Compact watchlist bar displaying category filter chips.
 *
 * Each chip shows the category label and count. Left-click delegates
 * color filtering to {@link IFilterManager.applyColorFilter}, middle-click
 * delegates reset to {@link IFilterManager.resetFilters}, and contextmenu
 * delegates flag filtering to {@link IFilterManager.applyFlagFilter}.
 *
 * Compact-only mode — no disclosure shell, toggle, or expanded details.
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

  /** WatchListHandler explicitly refreshes the bar after watchlist painting. */
  protected get refreshEvents(): readonly DomainEventType[] {
    return [];
  }

  /** @inheritdoc */
  protected async loadData(): Promise<BucketSummary> {
    return this.paintManager.summarizeBuckets();
  }

  /**
   * Render compact chips for all watch categories in canonical order.
   * Each chip is a `<button>` with BEM class, data-color, title, aria-label, and count.
   * DEFAULT_DAILY display count includes uncategorizedCount.
   */
  protected renderCompact(data: BucketSummary): string {
    const chips: string[] = [];

    for (const cat of ALL_WATCH_CATEGORIES) {
      const count = data.buckets.get(cat.id) ?? 0;
      const displayCount = cat.id === WatchCategoryId.DEFAULT_DAILY ? count + data.uncategorizedCount : count;

      chips.push(
        `<button type="button" class="${this.bemElement('chip')}" ` +
          `data-color="${cat.color}" ` +
          `title="${cat.label}: ${displayCount}" ` +
          `aria-label="${cat.label}: ${displayCount}">` +
          `${displayCount}</button>`
      );
    }

    return chips.join('');
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

  /**
   * Bind delegated mousedown and contextmenu handlers on the chip selector,
   * then reapply filters so the active filter chain survives summary repaint.
   *
   * Left mousedown → {@link IFilterManager.applyColorFilter}.
   * Middle mousedown → {@link IFilterManager.resetFilters}.
   * Contextmenu → {@link IFilterManager.applyFlagFilter} with preventDefault/stopPropagation.
   */
  protected onPaint($root: JQuery, _data: BucketSummary): void {
    const chipSelector = `.${this.bemElement('chip')}`;

    $root
      .off(`mousedown.${this.chipEventNs}`, chipSelector)
      .on(`mousedown.${this.chipEventNs}`, chipSelector, (event: JQuery.MouseDownEvent) => {
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
}
