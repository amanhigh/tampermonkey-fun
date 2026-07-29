import { BaseBar, IBaseBar } from './base';
import { BarId, BarStatus } from '../../models/bar';
import { DomainEventType } from '../../models/domain_event';
import { TickerTimeframe } from '../../models/timeframe';
import { ITimeFrameManager } from '../../manager/timeframe';
import { Notifier } from '../../util/notify';

// ── Module Constants ──

/** Emoji prefix displayed before the timeframe chips. */
const EMOJI_TIMEFRAMES = '\u{1F9ED}';

/**
 * Tooltip text shown when hovering over a timeframe chip.
 * Explains the recommended timeframe toggle purpose.
 */
const TOOLTIP_TEXT = 'Recommended timeframe for this ticker. Click to add/remove.';

/**
 * Interface for the timeframe bar presentation component.
 * Renders clickable timeframe chips and handles toggle interactions.
 *
 * Preserves the existing exported type name as a type alias to {@link IBaseBar}.
 */
export type ITimeFrameHandler = IBaseBar;

/**
 * Timeframe bar below the display card.
 *
 * Shows all six possible timeframe codes as clickable chips.
 * Active chips (those in the backend ticker.timeframes) are colored;
 * inactive chips are muted. Clicking toggles the code on/off in the backend.
 *
 * Compact-only: does not override {@link renderDetails} so BaseBar renders
 * compact content directly without disclosure shell.
 *
 * Listens to TICKER_CHANGED (ticker switch) and TICKER_TIMEFRAMES_CHANGED
 * (toggle result) to re-render when state changes.
 */
export class TimeFrameBar extends BaseBar<readonly TickerTimeframe[]> implements ITimeFrameHandler {
  /** Prevents concurrent toggle operations. */
  private toggling = false;

  constructor(private readonly timeFrameManager: ITimeFrameManager) {
    super(BarId.TIMEFRAME);
  }

  // ── Event/data contracts ──

  /** @inheritdoc */
  protected get refreshEvents(): readonly DomainEventType[] {
    return [DomainEventType.TICKER_CHANGED, DomainEventType.TICKER_TIMEFRAMES_CHANGED];
  }

  /** @inheritdoc */
  protected async loadData(): Promise<readonly TickerTimeframe[]> {
    return this.timeFrameManager.getActiveTimeframes();
  }

  /** @inheritdoc */
  protected resolveStatus(data: readonly TickerTimeframe[]): BarStatus {
    if (data.length < 3) {
      return BarStatus.ERROR;
    }
    const hasYr = data.includes(TickerTimeframe.YR);
    return hasYr ? BarStatus.OK : BarStatus.WARN;
  }

  // ── Rendering ──

  /** @inheritdoc */
  protected renderCompact(data: readonly TickerTimeframe[]): string {
    const activeSet = new Set(data);
    const chipsHtml = this.buildChipsHtml(activeSet);
    return `${EMOJI_TIMEFRAMES} ${chipsHtml}`;
  }

  // ── Post-paint hook — delegated chip clicks ──

  /** @inheritdoc */
  protected onPaint($root: JQuery, _data: readonly TickerTimeframe[]): void {
    this.bindChipClicks($root);
  }

  // ── Click Binding ──

  /**
   * Binds delegated chip click handler with off/on deduplication.
   * @param $root - jQuery-wrapped bar root element
   */
  private bindChipClicks($root: JQuery): void {
    const chipSelector = `.${this.bemElement('chip')}`;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    $root.off('click', chipSelector).on('click', chipSelector, (e) => {
      e.stopPropagation();
      void this.handleChipClick($(e.currentTarget));
    });
  }

  // ── Toggle Workflow ──

  /**
   * Handles click on a timeframe chip.
   * Toggles the timeframe code in the backend via TimeFrameManager,
   * then re-renders the bar on failure (successful toggle triggers
   * a domain event that also calls refresh).
   * @param $chip - The clicked chip element
   */
  private async handleChipClick($chip: JQuery): Promise<void> {
    const code = $chip.attr(this.bemDataAttr('code')) as TickerTimeframe | undefined;
    if (!code) {
      return;
    }

    if (this.toggling) {
      return;
    }
    this.toggling = true;

    // Add loading state
    $chip.addClass(this.bemElementModifier('chip', 'loading'));

    try {
      // Successful toggle publishes TICKER_TIMEFRAMES_CHANGED -> event handler calls refresh()
      await this.timeFrameManager.toggleTimeframe(code);
    } catch (error) {
      Notifier.warn(`Failed to toggle timeframe ${code}: ${(error as Error).message}`);
      // Re-render to restore actual backend state (no event published on failure)
      await this.refresh();
    } finally {
      this.toggling = false;
    }
  }

  // ── Markup Builders ──

  /**
   * Builds the inner HTML for all six timeframe chips in display order.
   * @param activeSet - Set of backend-active timeframe codes
   */
  private buildChipsHtml(activeSet: Set<TickerTimeframe>): string {
    // All timeframe codes in catalog order — enum values match static catalog order
    const allCodes = Object.values(TickerTimeframe);
    return allCodes.map((code) => this.buildChip(code, activeSet.has(code))).join('');
  }

  /**
   * Builds a single timeframe chip `<span>` element.
   * @param code - Timeframe code (YR, SMN, etc.)
   * @param isActive - Whether this chip is currently active in the backend
   */
  private buildChip(code: TickerTimeframe, isActive: boolean): string {
    const chipClass = this.bemElement('chip');
    const stateClass = isActive
      ? this.bemElementModifier('chip', 'active')
      : this.bemElementModifier('chip', 'inactive');
    const codeAttr = this.bemDataAttr('code');
    return `<span class="${chipClass} ${stateClass}" ${codeAttr}="${code}" title="${TOOLTIP_TEXT}">${code}</span>`;
  }
}
