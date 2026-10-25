import { BaseBar, IBaseBar } from './base';
import { BarId, BarIndicatorUpdate, BarStatus } from '../../models/bar';
import { DomainEventType } from '../../models/domain_event';
import { TickerTimeframe } from '../../models/timeframe';
import { ITimeFrameManager } from '../../manager/timeframe';
import { IBarkatManager } from '../../manager/barkat';
import { IDomManager } from '../../manager/dom';
import { escapeHtml } from '../../util/html';
import { Notifier } from '../../util/notify';

// ── Module Constants ──

/** Emoji prefix displayed before the timeframe chips. */
const EMOJI_TIMEFRAMES = '\u{1F9ED}';

/** Generic click affordance hint used as the native chip tooltip. */
const CLICK_HINT = 'Click to add/remove.';

/** Native tooltip for a selected chip whose Barkat verdict is not preferred. */
const TITLE_SELECTED_NOT_PREFERRED = 'Selected \u00B7 Barkat: not preferred. Click to remove.';

/** Native tooltip for an unselected chip whose Barkat verdict is preferred. */
const TITLE_UNSELECTED_PREFERRED = 'Not selected \u00B7 Barkat: preferred. Click to add.';

/** Namespaced jQuery event namespace for delegated bindings on this bar. */
const EVENT_NS = 'bar-tf';

/** Corner badge glyph for a selection/verdict mismatch. */
const MISMATCH_GLYPH = '\u2260';

// ── Data contract ──

/**
 * Mandatory data for the timeframe bar: the ticker captured before the selection
 * load plus the backend-active codes for it.
 *
 * Capturing the ticker first binds any later analysis to the exact request that
 * produced the painted selection, so a late resolve or a ticker switch never
 * queries against the wrong ticker.
 */
interface TimeFrameBarData {
  /** Ticker captured before the selection load. */
  readonly ticker: string;
  /** Backend-active timeframe codes for {@link ticker}. */
  readonly activeCodes: readonly TickerTimeframe[];
}

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
 * Barkat analysis is a secondary, read-only overlay delivered through the shared
 * optional-indicator lifecycle: chips paint from the selection load alone (while
 * the bar is hidden during that mandatory phase), then the mismatch badge and
 * native `title` hint are updated in place once the analysis resolves. Full
 * analysis detail lives in the side panel, so no metric-level markup is rendered
 * here. Analysis failure is quiet (no notifications) and only marks indicators
 * unavailable through BaseBar.
 *
 * Compact-only: does not override {@link renderDetails} so BaseBar renders
 * compact content directly without disclosure shell.
 *
 * Listens to TICKER_CHANGED (ticker switch) and TICKER_TIMEFRAMES_CHANGED
 * (toggle result) to re-render when state changes.
 */
export class TimeFrameBar extends BaseBar<TimeFrameBarData> implements ITimeFrameHandler {
  /** Prevents concurrent toggle operations. */
  private toggling = false;

  constructor(
    private readonly timeFrameManager: ITimeFrameManager,
    private readonly barkatManager: IBarkatManager,
    private readonly domManager: IDomManager
  ) {
    super(BarId.TIMEFRAME);
  }

  // ── Event/data contracts ──

  /** @inheritdoc */
  protected get refreshEvents(): readonly DomainEventType[] {
    return [DomainEventType.TICKER_CHANGED, DomainEventType.TICKER_TIMEFRAMES_CHANGED];
  }

  /** @inheritdoc */
  protected async loadData(): Promise<TimeFrameBarData> {
    const ticker = this.domManager.getTicker();
    const activeCodes = await this.timeFrameManager.getActiveTimeframes();
    return { ticker, activeCodes };
  }

  /** @inheritdoc */
  protected resolveStatus(data: TimeFrameBarData): BarStatus {
    const activeCodes = data.activeCodes;
    if (activeCodes.length < 3) {
      return BarStatus.ERROR;
    }
    const hasYr = activeCodes.includes(TickerTimeframe.YR);
    return hasYr ? BarStatus.OK : BarStatus.WARN;
  }

  // ── Optional indicators (Barkat analysis overlay) ──

  /** @inheritdoc */
  protected get supportsIndicators(): boolean {
    return true;
  }

  /**
   * Loads the Barkat analysis for the captured ticker and emits in-place
   * badge/title updates for mismatching chips only: one update per assessed row
   * whose `pass` verdict disagrees with the painted selection. Matching rows and
   * unassessed timeframes (YR, DL never appear as analysis rows) are left
   * undecorated, so a full match yields no updates at all. A rejection propagates
   * to BaseBar, which marks indicators unavailable quietly.
   *
   * @inheritdoc
   */
  protected async loadIndicators(data: TimeFrameBarData): Promise<readonly BarIndicatorUpdate[]> {
    const analysis = await this.barkatManager.getTickerAnalysis(data.ticker);
    const activeCodes = data.activeCodes;
    const updates: BarIndicatorUpdate[] = [];

    for (const row of analysis.timeframes) {
      const isActive = activeCodes.includes(row.timeframe);
      const isPreferred = row.status === 'pass';
      if (isActive === isPreferred) {
        continue;
      }

      updates.push({
        selector: `.${this.bemElement('chip')}[${this.bemDataAttr('code')}="${row.timeframe}"]`,
        badge: MISMATCH_GLYPH,
        title: isActive ? TITLE_SELECTED_NOT_PREFERRED : TITLE_UNSELECTED_PREFERRED,
      });
    }

    return updates;
  }

  // ── Rendering ──

  /** @inheritdoc */
  protected renderCompact(data: TimeFrameBarData): string {
    const activeSet = new Set(data.activeCodes);
    const chipsHtml = this.buildChipsHtml(activeSet);
    return `${EMOJI_TIMEFRAMES} ${chipsHtml}`;
  }

  // ── Post-paint hook — delegated chip bindings ──

  /** @inheritdoc */
  protected onPaint($root: JQuery, _data: TimeFrameBarData): void {
    this.bindChipClicks($root);
  }

  // ── Binding ──

  /**
   * Binds delegated chip click handler with namespaced off/on deduplication.
   * @param $root - jQuery-wrapped bar root element
   */
  private bindChipClicks($root: JQuery): void {
    const chipSelector = `.${this.bemElement('chip')}`;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    $root.off(`click.${EVENT_NS}`, chipSelector).on(`click.${EVENT_NS}`, chipSelector, (e) => {
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
   * Builds one chip button with its escaped native tooltip.
   * The mismatch badge is an absolutely positioned overlay added later in place
   * through the optional-indicator lifecycle, so the row keeps its original
   * width and height and the chip node is never replaced.
   * @param code - Timeframe code (YR, SMN, etc.)
   * @param isActive - Whether this chip is currently active in the backend
   */
  private buildChip(code: TickerTimeframe, isActive: boolean): string {
    const chipClass = this.bemElement('chip');
    const stateClass = isActive
      ? this.bemElementModifier('chip', 'active')
      : this.bemElementModifier('chip', 'inactive');
    const codeAttr = this.bemDataAttr('code');

    return [
      `<button type="button" class="${chipClass} ${stateClass}" ${codeAttr}="${code}" `,
      `aria-pressed="${isActive ? 'true' : 'false'}" title="${escapeHtml(CLICK_HINT)}">`,
      `${code}</button>`,
    ].join('');
  }
}
